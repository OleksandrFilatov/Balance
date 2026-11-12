package com.balance.app.debt;

import com.balance.app.account.*;
import com.balance.app.category.*;
import com.balance.app.service.*;
import com.balance.app.transaction.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class DebtService {
  private final DebtRepository debts;
  private final DebtReversalRepository reversals;
  private final DebtPaymentRepository payments;
  private final AccountRepository accounts;
  private final AccountService balances;
  private final TransactionRepository movements;
  private final CategoryRepository categories;
  private final DebtMapper mapper;
  private final JdbcTemplate jdbc;

  public DebtService(
      DebtRepository d,
      DebtReversalRepository reversals,
      DebtPaymentRepository p,
      AccountRepository a,
      AccountService b,
      TransactionRepository t,
      CategoryRepository c,
      DebtMapper m,
      JdbcTemplate j) {
    debts = d;
    this.reversals = reversals;
    payments = p;
    accounts = a;
    balances = b;
    movements = t;
    categories = c;
    mapper = m;
    jdbc = j;
  }

  private DebtDto.Payment paymentView(DebtPayment p) {
    var r = reversals.findByPaymentId(p.id);
    return new DebtDto.Payment(
        p.id,
        p.debtId,
        p.accountId,
        p.principal,
        p.interest,
        p.principal.add(p.interest),
        p.operationDate,
        p.description,
        p.createdAt,
        p.principalTransactionId,
        p.interestTransactionId,
        r.isPresent(),
        r.map(x -> x.operationDate).orElse(null),
        r.map(x -> x.reason).orElse(null));
  }

  public DebtDto.Payment reverse(UUID debtId, UUID paymentId, DebtDto.Reverse request, UUID key) {
    keyLock(key);
    String fingerprint = debtId + ":" + paymentId + ":" + request;
    var replay = reversals.findByRequestKey(key);
    if (replay.isPresent()) {
      if (!replay.get().fingerprint.equals(fingerprint))
        throw DomainException.conflict("Key already used");
      return paymentView(
          payments.findById(paymentId).orElseThrow(() -> DomainException.missing("Payment")));
    }
    Debt d = debts.lock(debtId).orElseThrow(() -> DomainException.missing("Debt"));
    DebtPayment p =
        payments
            .findById(paymentId)
            .filter(x -> x.debtId.equals(debtId))
            .orElseThrow(() -> DomainException.missing("Payment"));
    if (reversals.findByPaymentId(paymentId).isPresent())
      throw DomainException.conflict("Payment already reversed");
    date(request.operationDate());
    if (request.operationDate() == null
        || request.operationDate().isBefore(p.operationDate)
        || request.reason() == null
        || request.reason().isBlank()
        || request.reason().length() > 500)
      throw DomainException.invalid("Invalid reversal date or reason");
    // Archived accounts must still allow correction of historical payments.
    Account a = accounts.lock(p.accountId).orElseThrow(() -> DomainException.missing("Account"));
    for (UUID source :
        java.util.stream.Stream.of(p.principalTransactionId, p.interestTransactionId)
            .filter(Objects::nonNull)
            .toList()) {
      var original =
          movements.findById(source).orElseThrow(() -> DomainException.missing("Movement"));
      FinancialTransaction correction =
          new FinancialTransaction(UUID.randomUUID(), "debt-reversal");
      correction.apply(
          new TransactionDto.Write(
              TransactionType.REVERSAL,
              original.getAmount(),
              "EUR",
              null,
              a.getId(),
              null,
              null,
              request.operationDate(),
              "Сторно: " + request.reason(),
              TransactionStatus.CONFIRMED),
          null,
          a,
          null);
      correction.linkDebt(debtId);
      correction.reverse(source);
      movements.saveAndFlush(correction);
    }
    DebtReversal r = new DebtReversal();
    r.id = UUID.randomUUID();
    r.paymentId = paymentId;
    r.operationDate = request.operationDate();
    r.reason = request.reason().strip();
    r.createdAt = Instant.now();
    r.requestKey = key;
    r.fingerprint = fingerprint;
    reversals.saveAndFlush(r);
    jdbc.update("update debt_automation set enabled=false,version=version+1,last_error=? where debt_id=? and enabled","Автооплата приостановлена после отмены. Проверьте исправление в истории долга.",debtId);
    if (d.openingRemaining.subtract(payments.paid(debtId)).signum() > 0) {
      d.status = "ACTIVE";
      refreshMonthlyDate(d);
    }
    d.updatedAt = Instant.now();
    debts.flush();
    return paymentView(p);
  }

  private void keyLock(UUID key) {
    if (key == null) throw DomainException.invalid("Idempotency key required");
    jdbc.queryForList(
        "select pg_advisory_xact_lock(?)",
        key.getMostSignificantBits() ^ key.getLeastSignificantBits());
  }

  private Debt getEntity(UUID id) {
    return debts.findById(id).orElseThrow(() -> DomainException.missing("Debt"));
  }

  private DebtDto.View view(Debt d) {
    return mapper.view(d, payments.paid(d.id));
  }

  private void date(LocalDate date) {
    if (date != null && (date.getYear() < 1 || date.getYear() > 9999))
      throw DomainException.invalid("Invalid date");
  }

  private void terms(Debt d, DebtDto.Terms t) {
    d.name = Money.name(t.name());
    d.creditor = Money.name(t.creditor());
    d.description = t.description() == null ? "" : t.description().strip();
    if (d.description.length() > 2000
        || !Set.of("PERSONAL", "BANK_LOAN", "INSTALLMENT").contains(t.kind()))
      throw DomainException.invalid("Invalid terms");
    d.kind = t.kind();
    d.annualRate = t.annualRate();
    if (d.annualRate != null) {
      try {
        d.annualRate = d.annualRate.setScale(4, RoundingMode.UNNECESSARY);
      } catch (ArithmeticException e) {
        throw DomainException.invalid("Invalid annual rate");
      }
      if (d.annualRate.signum() < 0 || d.annualRate.compareTo(new BigDecimal("1000")) > 0)
        throw DomainException.invalid("Invalid annual rate");
    }
    d.monthlyPayment = t.monthlyPayment() == null ? null : Money.amount(t.monthlyPayment(), true);
    date(t.nextPayment());
    d.nextPayment = t.nextPayment();
  }

  private Account account(UUID id) {
    if (id == null) throw DomainException.invalid("Account required");
    var a = accounts.lock(id).orElseThrow(() -> DomainException.missing("Account"));
    if (!a.isActive() || !"EUR".equals(a.getCurrency()))
      throw DomainException.invalid("Active EUR account required");
    return a;
  }

  private FinancialTransaction movement(
      Debt d,
      Account a,
      TransactionType type,
      BigDecimal amount,
      Category category,
      FinanceScope scope,
      LocalDate date,
      String note) {
    FinancialTransaction t = new FinancialTransaction(UUID.randomUUID(), "debt-managed");
    boolean receipt = type == TransactionType.LOAN_RECEIPT;
    t.apply(
        new TransactionDto.Write(
            type,
            amount,
            "EUR",
            receipt ? null : a.getId(),
            receipt ? a.getId() : null,
            category == null ? null : category.getId(),
            scope,
            date,
            note,
            TransactionStatus.CONFIRMED),
        receipt ? null : a,
        receipt ? a : null,
        category);
    t.linkDebt(d.id);
    return movements.saveAndFlush(t);
  }

  public DebtDto.View createMonthly(DebtDto.Monthly r, UUID key) {
    date(r.firstDate());
    date(r.endDate());
    if (r.firstDate() == null || r.endDate() == null || r.endDate().isBefore(r.firstDate()))
      throw DomainException.invalid("End date must not precede first payment");
    long last =
        java.time.temporal.ChronoUnit.MONTHS.between(
            YearMonth.from(r.firstDate()), YearMonth.from(r.endDate()));
    if (r.firstDate().plusMonths(last).isAfter(r.endDate())) last--;
    var monthly = Money.amount(r.payment(), true);
    var total = Money.amount(monthly.multiply(BigDecimal.valueOf(last + 1)), true);
    var created =
        create(
            new DebtDto.Create(
                new DebtDto.Terms(
                    Money.name(r.name()),
                    Money.name(r.name()),
                      r.description()==null?"":r.description().strip(),
                    "PERSONAL",
                    BigDecimal.ZERO,
                    monthly,
                    r.firstDate()),
                total,
                total,
                "EUR",
                "EXISTING",
                null,
                null),
            key);
    jdbc.update(
        "insert into debt_monthly_plans(debt_id,first_date,end_date,monthly_amount) values(?,?,?,?)"
            + " on conflict(debt_id) do nothing",
        created.id(),
        r.firstDate(),
        r.endDate(),
        monthly);
    if (jdbc.queryForObject(
            "select count(*) from debt_monthly_plans where debt_id=? and first_date=? and"
                + " end_date=? and monthly_amount=?",
            Integer.class,
            created.id(),
            r.firstDate(),
            r.endDate(),
            monthly)
        != 1) throw DomainException.conflict("Key already used");
    return created;
  }

  private void refreshMonthlyDate(Debt d) {
    jdbc.query(
        "select first_date,monthly_amount from debt_monthly_plans where debt_id=?",
        rs -> {
          long completed =
              payments
                  .paid(d.id)
                  .divideToIntegralValue(rs.getBigDecimal("monthly_amount"))
                  .longValueExact();
          d.nextPayment = rs.getObject("first_date", LocalDate.class).plusMonths(completed);
        },
        d.id);
  }

  public DebtDto.View create(DebtDto.Create r, UUID key) {
    keyLock(key);
    String fingerprint = r.toString();
    var old = debts.findByCreateKey(key);
    if (old.isPresent()) {
      if (!old.get().createFingerprint.equals(fingerprint))
        throw DomainException.conflict("Key already used");
      return view(old.get());
    }
    Debt d = new Debt();
    d.id = UUID.randomUUID();
    d.createdAt = Instant.now();
    d.updatedAt = d.createdAt;
    d.currency = "EUR";
    d.createKey = key;
    d.createFingerprint = fingerprint;
    d.origin = r.origin();
    terms(d, r.terms());
    d.originalAmount = Money.amount(r.originalAmount(), true);
    d.openingRemaining = Money.amount(r.openingRemaining(), false);
    if (!"EUR".equals(r.currency())
        || d.openingRemaining.signum() < 0
        || d.openingRemaining.compareTo(d.originalAmount) > 0)
      throw DomainException.invalid("Invalid opening liability");
    if (!Set.of("EXISTING", "NEW_LOAN").contains(d.origin))
      throw DomainException.invalid("Invalid loan origin");
    d.status = d.openingRemaining.signum() == 0 ? "CLOSED" : "ACTIVE";
    Account account = null;
    if ("NEW_LOAN".equals(d.origin)) {
      if (d.originalAmount.compareTo(d.openingRemaining) != 0 || r.operationDate() == null)
        throw DomainException.invalid("New loan must be received in full");
      date(r.operationDate());
      account = account(r.accountId());
    } else if (r.accountId() != null || r.operationDate() != null)
      throw DomainException.invalid("Existing debt does not move money");
    debts.saveAndFlush(d);
    if (account != null)
      movement(
          d,
          account,
          TransactionType.LOAN_RECEIPT,
          d.originalAmount,
          null,
          null,
          r.operationDate(),
          "Получение кредита: " + d.name);
    return view(d);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<DebtDto.View> list() {
    return debts.findAll(Sort.by("createdAt", "id")).stream().filter(d -> !d.deleted).map(this::view).toList();
  }

  public void delete(UUID id) {
    var d=debts.lock(id).orElseThrow(() -> DomainException.missing("Debt"));
    if(d.deleted)return;
    d.deleted=true;
    d.updatedAt=Instant.now();
    debts.flush();
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public DebtDto.View get(UUID id) {
    var d=getEntity(id);if(d.deleted)throw DomainException.missing("Debt");return view(d);
  }

  public DebtDto.View update(UUID id, DebtDto.Update r) {
    Debt d = debts.lock(id).orElseThrow(() -> DomainException.missing("Debt"));
    if(d.deleted)throw DomainException.missing("Debt");
    Money.version(d.version, r.version());
    if (!Set.of("ACTIVE", "CLOSED", "ARCHIVED").contains(r.status()))
      throw DomainException.invalid("Invalid debt status");
    BigDecimal remaining = d.openingRemaining.subtract(payments.paid(id));
    if (!"ACTIVE".equals(r.status()) && remaining.signum() != 0)
      throw DomainException.conflict("Only repaid debts may be closed or archived");
    if ("ACTIVE".equals(r.status()) && remaining.signum() == 0)
      throw DomainException.conflict("Debt is already repaid");
    if(jdbc.queryForObject("select count(*) from debt_monthly_plans where debt_id=?",Long.class,id)>0 &&
        (!Objects.equals(d.nextPayment,r.terms().nextPayment())||(d.monthlyPayment==null?r.terms().monthlyPayment()!=null:r.terms().monthlyPayment()==null||d.monthlyPayment.compareTo(r.terms().monthlyPayment())!=0)))
      throw DomainException.conflict("Месячные даты изменяются через перенос графика. Сумма взноса сохраняется, чтобы не изменить исходный долг.");
    terms(d, r.terms());
    d.updatedAt = Instant.now();
    d.status = r.status();
    debts.flush();
    return view(d);
  }

  public DebtDto.Payment pay(UUID id, DebtDto.Pay r, UUID key) {
    keyLock(key);
    String fingerprint = id + ":" + r;
    var old = payments.findByRequestKey(key);
    if (old.isPresent()) {
      if (!old.get().fingerprint.equals(fingerprint))
        throw DomainException.conflict("Key already used");
      return paymentView(old.get());
    }
    Debt d = debts.lock(id).orElseThrow(() -> DomainException.missing("Debt"));
    BigDecimal principal = Money.amount(r.principal(), false),
        interest = Money.amount(r.interest(), false);
    BigDecimal total = Money.amount(principal.add(interest), true);
    if (principal.signum() < 0
        || interest.signum() < 0
        || r.scope() == null
        || r.operationDate() == null) throw DomainException.invalid("Invalid payment");
    if (d.deleted || !"ACTIVE".equals(d.status)) throw DomainException.conflict("Debt is not active");
    var monthlyPlan=jdbc.queryForList("select first_date,monthly_amount from debt_monthly_plans where debt_id=?",id);
    if(!monthlyPlan.isEmpty()){
      var first=((java.sql.Date)monthlyPlan.getFirst().get("first_date")).toLocalDate();
      var monthly=(BigDecimal)monthlyPlan.getFirst().get("monthly_amount");
      long completed=payments.paid(id).divideToIntegralValue(monthly).longValueExact();
      if(!first.plusMonths(completed).equals(d.nextPayment))throw DomainException.conflict("Сначала согласуйте дату долга кнопкой «Перенести график». Платёж не проведён.");
    }
    if (principal.compareTo(d.openingRemaining.subtract(payments.paid(id))) > 0)
      throw DomainException.conflict("Principal exceeds remaining debt");
    date(r.operationDate());
    date(r.nextPayment());
    if(r.nextPayment()!=null&&jdbc.queryForObject("select count(*) from debt_monthly_plans where debt_id=?",Long.class,id)>0)throw DomainException.conflict("Следующая дата помесячного долга рассчитывается из графика автоматически.");
    String note = r.description() == null ? "" : r.description().strip();
    if (note.length() > 2000) throw DomainException.invalid("Description too long");
    Account a = account(r.accountId());
    DebtPayment p = new DebtPayment();
    p.id = UUID.randomUUID();
    p.debtId = id;
    p.accountId = a.getId();
    p.principal = principal;
    p.interest = interest;
    p.operationDate = r.operationDate();
    p.scheduledDate = d.nextPayment;
    p.description = note;
    p.createdAt = Instant.now();
    p.requestKey = key;
    p.fingerprint = fingerprint;
    if (principal.signum() > 0)
      p.principalTransactionId =
          movement(
                  d,
                  a,
                  TransactionType.DEBT_PRINCIPAL,
                  principal,
                  null,
                  null,
                  r.operationDate(),
                  "Основной долг: " + d.name)
              .getId();
    if (interest.signum() > 0) {
      var ids =
          jdbc.queryForList(
              "select id from categories where type='EXPENSE' and active and"
                  + " (id='00000000-0000-0000-0003-000000000001'::uuid or"
                  + " lower(btrim(name))=lower('Проценты по обязательствам')) order by id limit 1",
              UUID.class);
      UUID categoryId = ids.isEmpty() ? null : ids.getFirst();
      if (categoryId == null) throw DomainException.conflict("Restore interest category");
      Category c =
          categories
              .lock(categoryId)
              .orElseThrow(() -> DomainException.missing("Interest category"));
      if (!c.isActive()) throw DomainException.conflict("Interest category is inactive");
      p.interestTransactionId =
          movement(
                  d,
                  a,
                  TransactionType.EXPENSE,
                  interest,
                  c,
                  r.scope(),
                  r.operationDate(),
                  "Проценты: " + d.name)
              .getId();
    }
    payments.saveAndFlush(p);
    if (d.openingRemaining.subtract(payments.paid(id)).signum() == 0) {
      d.status = "CLOSED";
      d.nextPayment = null;
    } else if (r.nextPayment() != null) d.nextPayment = r.nextPayment();
    else refreshMonthlyDate(d);
    // Ensure version changes even for a payment that leaves metadata unchanged.
    d.updatedAt = Instant.now();
    debts.flush();
    return paymentView(p);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public DebtDto.History history(UUID id, int page, int size) {
    getEntity(id);
    if (page < 0 || size < 1 || size > 200) throw DomainException.invalid("Invalid pagination");
    var p =
        payments.findByDebtId(
            id,
            PageRequest.of(
                page,
                size,
                Sort.by(
                    Sort.Order.desc("operationDate"),
                    Sort.Order.desc("createdAt"),
                    Sort.Order.desc("id"))));
    return new DebtDto.History(
        p.getContent().stream().map(this::paymentView).toList(), page, size, p.getTotalElements());
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public DebtDto.Forecast forecast(UUID id) {
    Debt d = getEntity(id);
    return mapper.forecast(d, payments.paid(id));
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public DebtDto.Overview overview(LocalDate from, LocalDate to) {
    TransactionFilters.dates(from, to);
    date(from);
    date(to);
    var all = list();
    BigDecimal liability =
        all.stream().map(DebtDto.View::remaining).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal assets = balances.balances().totalsByCurrency().getOrDefault("EUR", BigDecimal.ZERO);
    BigDecimal monthly =
        all.stream()
            .filter(d -> "ACTIVE".equals(d.status()) && d.terms().monthlyPayment() != null)
            .map(d -> d.terms().monthlyPayment())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal expense =
        jdbc.queryForObject(
            "select coalesce(sum(amount),0) from financial_effects where type='EXPENSE' and"
                + " status='CONFIRMED' and not deleted and currency='EUR' and operation_date"
                + " between ? and ?",
            BigDecimal.class,
            from,
            to);
    BigDecimal principal =
        jdbc.queryForObject(
            "select coalesce(sum(amount),0) from financial_effects where type='DEBT_PRINCIPAL'"
                + " and status='CONFIRMED' and not deleted and currency='EUR' and operation_date"
                + " between ? and ?",
            BigDecimal.class,
            from,
            to);
    var upcoming =
        all.stream()
            .filter(d -> "ACTIVE".equals(d.status()) && d.terms().nextPayment() != null)
            .sorted(Comparator.comparing(d -> d.terms().nextPayment()))
            .limit(5)
            .toList();
    return new DebtDto.Overview(
        "EUR",
        liability,
        all.stream().filter(d -> "ACTIVE".equals(d.status())).count(),
        monthly,
        assets,
        assets.subtract(liability),
        expense,
        expense.add(principal),
        from,
        to,
        upcoming);
  }
}
