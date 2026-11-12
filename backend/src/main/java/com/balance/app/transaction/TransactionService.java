package com.balance.app.transaction;

import com.balance.app.account.*;
import com.balance.app.category.*;
import com.balance.app.service.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TransactionService {
  private final TransactionRepository transactions;
  private final AccountRepository accounts;
  private final CategoryRepository categories;
  private final TransactionValidation validation;
  private final TransactionMapper mapper;
  private final JdbcTemplate jdbc;

  public TransactionService(
      TransactionRepository transactions,
      AccountRepository accounts,
      CategoryRepository categories,
      TransactionValidation validation,
      TransactionMapper mapper,
      JdbcTemplate jdbc) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.categories = categories;
    this.validation = validation;
    this.mapper = mapper;
    this.jdbc = jdbc;
  }

  public TransactionDto.Created create(UUID key, TransactionDto.Write request) {
    return createInternal(key, request, false);
  }

  /**
   * Existing locked schedules retain their category after it is hidden from new selections. No REST
   * controller exposes this entry point; the recurring service supplies the template data.
   */
  public TransactionDto.Created createScheduled(UUID key, TransactionDto.Write request) {
    return createInternal(key, request, true);
  }

  private TransactionDto.Created createInternal(
      UUID key, TransactionDto.Write request, boolean scheduledCategory) {
    if (key == null) throw DomainException.invalid("Idempotency-Key UUID header is required");
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var data = validation.normalize(request);
    String fingerprint = fingerprint(data);
    // PostgreSQL transaction-scoped lock serializes retries, including across application
    // instances.
    // Hash collisions merely serialize unrelated requests; the full UUID is checked in the unique
    // column.
    jdbc.queryForList(
        "select pg_advisory_xact_lock(?)",
        key.getMostSignificantBits() ^ key.getLeastSignificantBits());
    var previous = transactions.findByCreateKey(key);
    if (previous.isPresent()) {
      var t = previous.get();
      if (!t.getCreateFingerprint().equals(fingerprint))
        throw DomainException.conflict("Idempotency key already used with another request");
      if (t.isDeleted() || t.getVersion() != 0L)
        throw DomainException.conflict(
            "Original transaction was changed or deleted; no duplicate created");
      return new TransactionDto.Created(mapper.view(t), true);
    }
    var t = new FinancialTransaction(key, fingerprint);
    apply(t, data, null, scheduledCategory);
    transactions.saveAndFlush(t);
    return new TransactionDto.Created(mapper.view(t), false);
  }

  public TransactionDto.View update(UUID id, TransactionDto.Update request) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var t = activeLocked(id);
    if(t.getHouseholdPaymentId()!=null)throw DomainException.conflict("Используйте историю оплаты коммуналки за месяц.");
    if (t.getType() == TransactionType.OPENING_ADJUSTMENT)
      throw DomainException.conflict("Opening adjustments are immutable; create a new correction");
    if (t.getDebtId() != null || t.getRecurringId() != null)
      throw DomainException.conflict("Debt movements are immutable; use debt history");
    Money.version(t.getVersion(), request.version());
    var data = validation.normalize(request.transaction());
    apply(t, data, t);
    transactions.flush();
    return mapper.view(t);
  }

  public void delete(UUID id, long version) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var t = transactions.lock(id).orElseThrow(() -> DomainException.missing("Transaction"));
    if(t.getHouseholdPaymentId()!=null)throw DomainException.conflict("Отмените оплату месяца в разделе коммуналки.");
    if (t.getType() == TransactionType.OPENING_ADJUSTMENT)
      throw DomainException.conflict("Opening adjustments are immutable; create a new correction");
    if (t.getDebtId() != null || t.getRecurringId() != null)
      throw DomainException.conflict("Debt movements are immutable; use debt history");
    if (t.isDeleted()) return; // Safe retry; deleted UUIDs are never reused.
    Money.version(t.getVersion(), version);
    t.delete();
    transactions.flush();
  }

  private FinancialTransaction activeLocked(UUID id) {
    var t = transactions.lock(id).orElseThrow(() -> DomainException.missing("Transaction"));
    if (t.isDeleted()) throw DomainException.missing("Transaction");
    return t;
  }

  private void apply(
      FinancialTransaction t, TransactionDto.Write data, FinancialTransaction previous) {
    apply(t, data, previous, false);
  }

  private void apply(
      FinancialTransaction t,
      TransactionDto.Write data,
      FinancialTransaction previous,
      boolean scheduledCategory) {
    Map<UUID, Account> refs = new HashMap<>();
    // Stable order prevents opposite transfers from taking account locks in opposite orders.
    java.util.stream.Stream.of(data.debitAccountId(), data.creditAccountId())
        .filter(Objects::nonNull)
        .distinct()
        .sorted()
        .forEach(id ->
            refs.put(id, accounts.lock(id).orElseThrow(() -> DomainException.missing("Account"))));
    Account debit = refs.get(data.debitAccountId()), credit = refs.get(data.creditAccountId());
    Category category =
        data.categoryId() == null
            ? null
            : categories
                .lock(data.categoryId())
                .orElseThrow(() -> DomainException.missing("Category"));
    validation.references(data, debit, credit, category, previous, scheduledCategory);
    t.apply(data, debit, credit, category);
  }

  @Transactional(readOnly = true)
  public TransactionDto.View get(UUID id) {
    var t =
        transactions
            .findById(id)
            .filter(v -> !v.isDeleted())
            .orElseThrow(() -> DomainException.missing("Transaction"));
    return mapper.view(t);
  }

  @Transactional(readOnly = true)
  public TransactionDto.Page list(TransactionDto.Filter filter, int page, int size) {
    if (page < 0 || size < 1 || size > 200)
      throw DomainException.invalid("page must be >= 0 and size between 1 and 200");
    var result =
        transactions.findAll(
            TransactionFilters.matching(filter),
            PageRequest.of(
                page,
                size,
                Sort.by(
                    Sort.Order.desc("operationDate"),
                    Sort.Order.desc("createdAt"),
                    Sort.Order.desc("id"))));
    return new TransactionDto.Page(
        result.getContent().stream().map(mapper::view).toList(),
        page,
        size,
        result.getTotalElements(),
        result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public TransactionDto.Summary summary(LocalDate from, LocalDate to, String currency) {
    if (from == null || to == null) throw DomainException.invalid("from and to are required");
    TransactionFilters.dates(from, to);
    Money.currency(currency);
    var s = transactions.summary(from, to, currency);
    return new TransactionDto.Summary(
        from,
        to,
        currency,
        s.getIncome(),
        s.getExpense(),
        s.getIncome().subtract(s.getExpense()),
        s.getPersonalExpense(),
        s.getHouseholdExpense());
  }

  @org.springframework.transaction.annotation.Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public List<TransactionDto.MonthSummary> monthlySummary(String text,String currency){
    java.time.YearMonth end;
    try{if(text==null||!text.matches("[0-9]{4}-(0[1-9]|1[0-2])"))throw new IllegalArgumentException();end=java.time.YearMonth.parse(text);if(end.getYear()<1)throw new IllegalArgumentException();}catch(Exception e){throw DomainException.invalid("Use month YYYY-MM");}
    Money.currency(currency);var rows=new ArrayList<TransactionDto.MonthSummary>();
    for(int offset=5;offset>=0;offset--){var month=end.minusMonths(offset);if(month.getYear()<1)continue;var s=summary(month.atDay(1),month.atEndOfMonth(),currency);rows.add(new TransactionDto.MonthSummary(month.toString(),s.income(),s.expense(),s.net(),s.personalExpense(),s.householdExpense()));}return rows;
  }

  private String fingerprint(TransactionDto.Write data) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(data.toString().getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public TransactionDto.ExpenseAnalytics expenses(LocalDate from, LocalDate to, String currency) {
    if (from == null || to == null) throw DomainException.invalid("from and to are required");
    TransactionFilters.dates(from, to);
    Money.currency(currency);
    var daily =
        transactions.dailyExpenses(from, to, currency).stream()
            .map(r -> new TransactionDto.DailyExpense(r.getDate(), r.getAmount()))
            .toList();
    var categories =
        transactions.categoryExpenses(from, to, currency).stream()
            .map(r ->
                new TransactionDto.CategoryExpense(r.getCategoryId(), r.getName(), r.getAmount()))
            .toList();
    return new TransactionDto.ExpenseAnalytics(from, to, currency, daily, categories);
  }
}
