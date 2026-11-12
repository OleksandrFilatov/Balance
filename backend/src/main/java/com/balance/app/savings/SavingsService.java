package com.balance.app.savings;

import com.balance.app.account.*;
import com.balance.app.service.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class SavingsService {
  private final SavingsRepository goals;
  private final SavingsEntryRepository entries;
  private final AccountRepository accounts;
  private final AccountService balances;
  private final SavingsMapper mapper;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public SavingsService(
      SavingsRepository g,
      SavingsEntryRepository e,
      AccountRepository a,
      AccountService b,
      SavingsMapper m,
      JdbcTemplate j,@Value("${balance.time-zone:Europe/Berlin}") String zone) {
    goals = g;
    entries = e;
    accounts = a;
    balances = b;
    mapper = m;
    jdbc = j;
    clock=Clock.system(ZoneId.of(zone));
  }

  private void lock() {
    jdbc.queryForList("select pg_advisory_xact_lock(729145061)");
  }

  private SavingsGoal goal(UUID id) {
    return goals
        .findById(id)
        .filter(g -> !g.deleted)
        .orElseThrow(() -> DomainException.missing("Goal"));
  }

  private BigDecimal reserved(UUID goal, UUID account) {
    return jdbc.queryForObject(
        "select coalesce(sum(amount),0) from savings_entries where (?::uuid is null or"
            + " goal_id=?::uuid) and (?::uuid is null or account_id=?::uuid)",
        BigDecimal.class,
        goal,
        goal,
        account,
        account);
  }

  private void event(
      SavingsGoal g, UUID account, BigDecimal amount, String action, String note, UUID key) {
    SavingsEntry e = new SavingsEntry();
    e.id = UUID.randomUUID();
    e.goalId = g.id;
    e.accountId = account;
    e.amount = amount;
    e.action = action;
    e.note = note == null ? "" : note.strip();
    e.createdAt = Instant.now();
    e.commandId = key;
    entries.saveAndFlush(e);
  }

  private void apply(SavingsGoal g, SavingsDto.Write r) {
    if (r == null || !"EUR".equals(r.currency()))
      throw DomainException.invalid("Savings support EUR only");
    g.name = Money.name(r.name());
    g.description = r.description() == null ? "" : r.description().strip();
    if (g.description.length() > 2000) throw DomainException.invalid("Description too long");
    g.target = Money.amount(r.target(), true);
    g.monthlyPlan = Money.amount(r.monthlyPlan(), false);
    if (g.monthlyPlan.signum() < 0)
      throw DomainException.invalid("Monthly plan cannot be negative");
    if (r.deadline() != null && (r.deadline().getYear() < 1 || r.deadline().getYear() > 9999))
      throw DomainException.invalid("Invalid date");
    g.currency = "EUR";
    g.deadline = r.deadline();
  }

  private SavingsDto.View view(SavingsGoal g) {
    return mapper.view(g, reserved(g.id, null), LocalDate.now(clock),clock.getZone());
  }

  private void validateNewDeadline(LocalDate date, LocalDate previous) {
    if (date != null
        && !date.equals(previous)
        && date.isBefore(LocalDate.now(clock)))
      throw DomainException.invalid("Goal deadline cannot be in the past");
  }

  public SavingsDto.View create(SavingsDto.Write r) {
    lock();
    validateNewDeadline(r.deadline(), null);
    SavingsGoal g = new SavingsGoal();
    g.id = UUID.randomUUID();
    g.createdAt = Instant.now();
    g.status = "ACTIVE";
    apply(g, r);
    goals.saveAndFlush(g);
    event(g, null, BigDecimal.ZERO, "CREATED", "", null);
    return view(g);
  }

  public SavingsDto.View update(UUID id, SavingsDto.Update r) {
    lock();
    SavingsGoal g = goal(id);
    Money.version(g.version, r.version());
    validateNewDeadline(r.goal().deadline(), g.deadline);
    apply(g, r.goal());
    if (!Set.of("ACTIVE", "ARCHIVED", "ACHIEVED").contains(r.status()))
      throw DomainException.invalid("Invalid status");
    if ("ACHIEVED".equals(r.status()) && reserved(id, null).compareTo(g.target) < 0)
      throw DomainException.conflict("Goal is not fully funded");
    g.status = r.status();
    goals.flush();
    event(
        g,
        null,
        BigDecimal.ZERO,
        "UPDATED",
        g.name
            + "; target="
            + g.target
            + "; plan="
            + g.monthlyPlan
            + "; deadline="
            + g.deadline
            + "; status="
            + g.status,
        null);
    return view(g);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<SavingsDto.View> list() {
    return goals.findAll(org.springframework.data.domain.Sort.by("createdAt", "id")).stream()
        .filter(g -> !g.deleted)
        .map(this::view)
        .toList();
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public SavingsDto.View get(UUID id) {
    return view(goal(id));
  }

  public void allocate(UUID id, SavingsDto.Funding r, UUID key) {
    command(id, r.accountId(), r.amount(), null, false, r.note(), key);
  }

  public void release(UUID id, SavingsDto.Funding r, UUID key) {
    command(id, r.accountId(), r.amount(), null, true, r.note(), key);
  }

  public void move(SavingsDto.Move r, UUID key) {
    if (r.toGoalId() == null) throw DomainException.invalid("Destination required");
    command(r.fromGoalId(), r.accountId(), r.amount(), r.toGoalId(), true, r.note(), key);
  }

  private void command(
      UUID id,
      UUID accountId,
      BigDecimal raw,
      UUID destination,
      boolean release,
      String note,
      UUID key) {
    lock();
    if (key == null) throw DomainException.invalid("Idempotency key required");
    BigDecimal amount = Money.amount(raw, true);
    if (note != null && note.length() > 2000) throw DomainException.invalid("Note too long");
    String fingerprint =
        List.of(
                id,
                accountId,
                amount,
                destination == null ? "" : destination,
                release,
                note == null ? "" : note)
            .toString();
    var previous =
        jdbc.queryForList("select fingerprint from savings_commands where id=?", String.class, key);
    if (!previous.isEmpty()) {
      if (!previous.getFirst().equals(fingerprint))
        throw DomainException.conflict("Key already used");
      return;
    }
    SavingsGoal from = goal(id), to = destination == null ? null : goal(destination);
    if (destination != null && destination.equals(id))
      throw DomainException.invalid("Choose different goals");
    var account = accounts.lock(accountId).orElseThrow(() -> DomainException.missing("Account"));
    if (!"EUR".equals(account.getCurrency())) throw DomainException.invalid("Currency mismatch");
    if (!release && (!account.isActive() || !"ACTIVE".equals(from.status)))
      throw DomainException.conflict("Inactive account or goal");
    if (to != null && !"ACTIVE".equals(to.status))
      throw DomainException.conflict("Destination is not active");
    if (release && reserved(id, accountId).compareTo(amount) < 0)
      throw DomainException.conflict("Insufficient goal allocation");
    if (!release
        && balances
                .balance(accountId)
                .balance()
                .subtract(reserved(null, accountId))
                .compareTo(amount)
            < 0) throw DomainException.conflict("Insufficient free funds");
    jdbc.update("insert into savings_commands(id,fingerprint) values (?,?)", key, fingerprint);
    event(
        from,
        accountId,
        release ? amount.negate() : amount,
        destination == null ? (release ? "RELEASED" : "ALLOCATED") : "REALLOCATED_OUT",
        note,
        key);
    if (to != null) event(to, accountId, amount, "REALLOCATED_IN", note, key);
    // Reopening a completed goal after a release avoids a stale achieved status.
    if (release
        && "ACHIEVED".equals(from.status)
        && reserved(id, null).compareTo(from.target) < 0) {
      from.status = "ACTIVE";
      goals.flush();
    }
  }

  public void delete(UUID id, long version) {
    lock();
    var optional = goals.findById(id);
    if (optional.isEmpty()) throw DomainException.missing("Goal");
    var g = optional.get();
    if (g.deleted) return;
    Money.version(g.version, version);
    var rows =
        jdbc.queryForList(
            "select account_id,sum(amount) as amount from savings_entries where goal_id=? and"
                + " account_id is not null group by account_id having sum(amount)>0",
            id);
    for (var row : rows) {
      BigDecimal remaining = (BigDecimal) row.get("amount");
      BigDecimal limit = new BigDecimal("99999999999999999.99");
      while (remaining.signum() > 0) {
        BigDecimal part = remaining.min(limit);
        event(
            g,
            (UUID) row.get("account_id"),
            part.negate(),
            "DELETION_RELEASE",
            "Released on goal deletion",
            null);
        remaining = remaining.subtract(part);
      }
    }
    g.deleted = true;
    goals.flush();
    event(g, null, BigDecimal.ZERO, "DELETED", "", null);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public SavingsDto.Overview overview() {
    var rows =
        balances.balances().accounts().stream()
            .filter(b -> "EUR".equals(b.currency()))
            .map(b -> {
              BigDecimal allocated = reserved(null, b.accountId());
              return new SavingsDto.Coverage(
                  b.accountId(),
                  accounts.findById(b.accountId()).orElseThrow().getName(),
                  "EUR",
                  b.balance(),
                  allocated,
                  b.balance().subtract(allocated),
                  b.balance().compareTo(allocated) < 0 && allocated.signum() > 0);
            })
            .toList();
    BigDecimal total =
        rows.stream().map(SavingsDto.Coverage::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal saved =
        rows.stream().map(SavingsDto.Coverage::reserved).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new SavingsDto.Overview(
        saved,
        total.subtract(saved),
        total,
        goals.findAll().stream().filter(g -> !g.deleted && "ACTIVE".equals(g.status)).count(),
        rows);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public SavingsDto.HistoryPage history(UUID id, int page, int size) {
    if (!goals.existsById(id)) throw DomainException.missing("Goal");
    if (page < 0 || size < 1 || size > 200) throw DomainException.invalid("Invalid pagination");
    var rows =
        jdbc.query(
            "select * from savings_entries where goal_id=? order by created_at desc,id desc limit ?"
                + " offset ?",
            (rs, n) ->
                new SavingsDto.History(
                    rs.getObject("id", UUID.class),
                    rs.getObject("account_id", UUID.class),
                    rs.getBigDecimal("amount"),
                    rs.getString("action"),
                    rs.getString("note"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getObject("command_id", UUID.class)),
            id,
            size,
            (long) page * size);
    return new SavingsDto.HistoryPage(
        rows,
        page,
        size,
        jdbc.queryForObject(
            "select count(*) from savings_entries where goal_id=?", Long.class, id));
  }

  @Transactional(readOnly = true)
  public Map<UUID, BigDecimal> allocations(UUID id) {
    goal(id);
    Map<UUID, BigDecimal> result = new LinkedHashMap<>();
    jdbc.query(
        "select account_id,sum(amount) amount from savings_entries where goal_id=? and account_id"
            + " is not null group by account_id having sum(amount)>0",
        rs -> {
          result.put(rs.getObject("account_id", UUID.class), rs.getBigDecimal("amount"));
        },
        id);
    return result;
  }
}
