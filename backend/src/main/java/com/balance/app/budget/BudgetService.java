package com.balance.app.budget;

import com.balance.app.category.CategoryRepository;
import com.balance.app.service.*;
import com.balance.app.transaction.*;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class BudgetService {
  private final BudgetRepository budgets;
  private final CategoryRepository categories;
  private final BudgetMapper mapper;
  private final JdbcTemplate jdbc;

  public BudgetService(BudgetRepository b, CategoryRepository c, BudgetMapper m, JdbcTemplate j) {
    budgets = b;
    categories = c;
    mapper = m;
    jdbc = j;
  }

  private LocalDate month(String value) {
    try {
      if (value == null || !value.matches("[0-9]{4}-(0[1-9]|1[0-2])"))
        throw new DateTimeParseException("Invalid month", "", 0);
      var m = YearMonth.parse(value);
      if (m.getYear() < 1)
        throw DomainException.invalid("Month must be between 0001-01 and 9999-12");
      return m.atDay(1);
    } catch (DateTimeParseException e) {
      throw DomainException.invalid("Use month YYYY-MM");
    }
  }

  private BigDecimal amount(BigDecimal value) {
    var n = Money.amount(value, false);
    if (n.signum() < 0) throw DomainException.invalid("Budget amounts must not be negative");
    return n;
  }

  private void apply(Budget b, BudgetDto.Plan plan) {
    if (plan == null || plan.limits() == null || plan.limits().size() > 1000)
      throw DomainException.invalid("Invalid plan");
    var income = amount(plan.plannedIncome());
    var expense = amount(plan.plannedExpense());
    Map<UUID, BigDecimal> limits = new HashMap<>();
    for (var l : plan.limits()) {
      if (l == null || l.categoryId() == null) throw DomainException.invalid("Category required");
      var c =
          categories
              .findById(l.categoryId())
              .orElseThrow(() -> DomainException.missing("Category"));
      if (c.getType() != TransactionType.EXPENSE)
        throw DomainException.invalid("Budget limits require expense categories");
      if (limits.put(l.categoryId(), amount(l.amount())) != null)
        throw DomainException.invalid("Duplicate category limit");
    }
    var allocated = limits.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (allocated.compareTo(expense) > 0)
      throw DomainException.invalid("Category limits exceed total planned expenses");
    b.plannedIncome = income;
    b.plannedExpense = expense;
    b.limits.clear();
    b.limits.putAll(limits);
    b.updatedAt = Instant.now();
  }

  public BudgetDto.View create(BudgetDto.Create d) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    if (d.scope() == null) throw DomainException.invalid("Scope required");
    var date = month(d.month());
    if (budgets.findByMonthAndScope(date, d.scope()).isPresent())
      throw DomainException.conflict("Budget already exists for this month and scope");
    var b = new Budget();
    b.id = UUID.randomUUID();
    b.month = date;
    b.scope = d.scope();
    b.createdAt = Instant.now();
    apply(b, d.plan());
    return mapper.view(budgets.saveAndFlush(b));
  }

  public BudgetDto.View update(UUID id, BudgetDto.Update d) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var b = budgets.lock(id).orElseThrow(() -> DomainException.missing("Budget"));
    Money.version(b.version, d.version());
    apply(b, d.plan());
    budgets.flush();
    return mapper.view(b);
  }

  @Transactional(isolation = Isolation.REPEATABLE_READ)
  public BudgetDto.View copy(BudgetDto.Copy d) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var source =
        budgets
            .findByMonthAndScope(month(d.sourceMonth()), d.scope())
            .orElseThrow(() -> DomainException.missing("Source budget"));
    return create(new BudgetDto.Create(d.targetMonth(), d.scope(), mapper.view(source).plan()));
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<BudgetDto.View> history(FinanceScope scope) {
    if (scope == null) throw DomainException.invalid("Scope required");
    return budgets.findByScopeOrderByMonthDesc(scope).stream().map(mapper::view).toList();
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public BudgetDto.Report report(String selectedMonth, FinanceScope scope, UUID categoryId) {
    if (scope == null) throw DomainException.invalid("Scope required");
    var start = month(selectedMonth);
    var end = YearMonth.from(start).atEndOfMonth();
    var b = budgets.findByMonthAndScope(start, scope).orElse(null);
    var totals =
        jdbc.queryForMap(
            """
            select coalesce(sum(case when type='INCOME' then amount else 0 end),0) as income,
            coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) as expense
            from financial_effects where status='CONFIRMED' and not deleted and currency='EUR'
            and scope=? and operation_date between ? and ?
            """,
            scope.name(),
            start,
            end);
    var income = (BigDecimal) totals.get("income");
    var expense = (BigDecimal) totals.get("expense");
    Map<UUID, BigDecimal> actuals = new HashMap<>();
    jdbc.query(
        """
        select category_id,sum(amount) as amount from financial_effects
        where status='CONFIRMED' and not deleted and currency='EUR' and type='EXPENSE'
        and scope=? and operation_date between ? and ? group by category_id
        """,
        rs -> {
          actuals.put(rs.getObject("category_id", UUID.class), rs.getBigDecimal("amount"));
        },
        scope.name(),
        start,
        end);
    var limits = b == null ? Map.<UUID, BigDecimal>of() : b.limits;
    var all =
        categories.findAll().stream()
            .filter(c -> c.getType() == TransactionType.EXPENSE)
            .filter(c ->
                c.isActive() || limits.containsKey(c.getId()) || actuals.containsKey(c.getId()))
            .sorted(
                Comparator.comparing(com.balance.app.category.Category::getName)
                    .thenComparing(com.balance.app.category.Category::getId))
            .map(c -> {
              var plan = limits.get(c.getId());
              var actual = actuals.getOrDefault(c.getId(), new BigDecimal("0.00"));
              return new BudgetDto.Category(
                  c.getId(),
                  c.getName(),
                  c.isActive(),
                  plan,
                  actual,
                  plan == null ? null : plan.subtract(actual),
                  mapper.percent(actual, plan),
                  plan == null ? null : actual.subtract(plan),
                  plan != null && actual.compareTo(plan) > 0);
            })
            .toList();
    if (categoryId != null
        && categories
            .findById(categoryId)
            .filter(c -> c.getType() == TransactionType.EXPENSE)
            .isEmpty()) throw DomainException.invalid("Unknown expense category");
    var allocated = limits.values().stream().reduce(new BigDecimal("0.00"), BigDecimal::add);
    var without =
        all.stream()
            .filter(c -> c.planned() == null)
            .map(BudgetDto.Category::actual)
            .reduce(new BigDecimal("0.00"), BigDecimal::add);
    var plan = b == null ? null : b.plannedExpense;
    return new BudgetDto.Report(
        selectedMonth,
        scope,
        "EUR",
        b == null ? null : mapper.view(b),
        income,
        expense,
        plan == null ? null : plan.subtract(expense),
        mapper.percent(expense, plan),
        b == null ? null : income.subtract(b.plannedIncome),
        plan == null ? null : expense.subtract(plan),
        allocated,
        plan == null ? null : plan.subtract(allocated),
        without,
        plan != null && expense.compareTo(plan) > 0,
        all.stream().filter(c -> categoryId == null || c.categoryId().equals(categoryId)).toList());
  }
}
