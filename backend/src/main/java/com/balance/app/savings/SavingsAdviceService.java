package com.balance.app.savings;

import com.balance.app.account.PersonalMoneyDto;
import com.balance.app.account.PersonalMoneyService;
import com.balance.app.service.DomainException;
import com.balance.app.service.Money;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** A read-only recommendation from current cash, not an additional income or reservation. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class SavingsAdviceService {
  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private final PersonalMoneyService money;
  private final SavingsService savings;
  private final Clock clock;

  public SavingsAdviceService(PersonalMoneyService money, SavingsService savings,
      @Value("${balance.time-zone:Europe/Berlin}") String zone) {
    this.money = money;
    this.savings = savings;
    this.clock = Clock.system(ZoneId.of(zone));
  }

  public record Input(UUID goalId,
      @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal living,
      boolean useBalanceOnly) {}
  public record Choice(UUID id, String name) {}
  public record GoalAdvice(UUID id, String name, BigDecimal remaining, BigDecimal otherPlans,
      BigDecimal available, BigDecimal recommended, BigDecimal requiredMonthly,
      BigDecimal monthsNeeded, LocalDate estimatedDate, LocalDate deadline, boolean feasible) {}
  public record Advice(String month, String currency, boolean ready, List<String> missing,
      BigDecimal balance, BigDecimal income, BigDecimal mandatory, BigDecimal reserved,
      BigDecimal living, BigDecimal available, BigDecimal shortage, long unknownObligations,
      boolean useBalanceOnly, boolean underfunded, List<PersonalMoneyDto.Deduction> deductions,
      List<Choice> goals, GoalAdvice goal) {}

  public Advice advise(Input input) {
    var today = LocalDate.now(clock);
    var month = YearMonth.from(today);
    var cash = money.overview("EUR");
    var coverage = savings.overview();
    var goals = savings.list().stream().filter(g -> "ACTIVE".equals(g.status()))
        .filter(g -> g.forecast().remaining().signum() > 0)
        .sorted(Comparator.comparing(SavingsDto.View::deadline, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(SavingsDto.View::createdAt).thenComparing(SavingsDto.View::id)).toList();
    var selected = input.goalId() == null ? goals.stream().findFirst().orElse(null)
        : goals.stream().filter(g -> g.id().equals(input.goalId())).findFirst()
            .orElseThrow(() -> DomainException.invalid("Выберите активную незавершённую цель."));
    var living = input.living() == null ? null : Money.amount(input.living(), false);
    if (living != null && living.signum() < 0) throw DomainException.invalid("Negative living amount");
    var missing = new ArrayList<String>();
    if (living == null) missing.add("LIVING");
    if (cash.income().signum() == 0 && !input.useBalanceOnly()) missing.add("INCOME");
    if (cash.unknownObligations() != 0) missing.add("OBLIGATIONS");
    boolean ready = missing.isEmpty();
    // Goal contributions are handled below per selected goal, not twice as mandatory cash costs.
    var goalDues=cash.deductions().stream().filter(d->"GOAL".equals(d.type())).map(PersonalMoneyDto.Deduction::amount).reduce(ZERO,BigDecimal::add);
    var mandatory=cash.mandatory().subtract(goalDues);
    var net = ready ? cash.balance().subtract(mandatory).subtract(coverage.reserved()).subtract(living) : null;
    var available = net == null ? null : net.max(ZERO);
    var shortage = net == null ? null : net.negate().max(ZERO);
    GoalAdvice goal = null;
    if (ready && selected != null) {
      var chosenId = selected.id();
      var others=cash.deductions().stream().filter(d->"GOAL".equals(d.type())&&!d.href().equals("/savings/"+chosenId))
          .map(PersonalMoneyDto.Deduction::amount).reduce(ZERO,BigDecimal::add);
      var result = SavingsPlanningService.fromAvailable(selected, available, others, today);
      goal = new GoalAdvice(selected.id(), selected.name(), result.remaining(), others,
          result.available(), result.recommended(), result.requiredMonthly(), result.monthsNeeded(),
          result.estimatedDate(), result.deadline(), result.feasible());
    }
    return new Advice(month.toString(), "EUR", ready, List.copyOf(missing), cash.balance(),
        cash.income(), mandatory, coverage.reserved(), living, available, shortage,
        cash.unknownObligations(), input.useBalanceOnly(), coverage.accounts().stream().anyMatch(SavingsDto.Coverage::underfunded),
        cash.deductions().stream().filter(d->!"GOAL".equals(d.type())).toList(), goals.stream().map(g -> new Choice(g.id(), g.name())).toList(), goal);
  }
}
