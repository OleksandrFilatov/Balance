package com.balance.app.savings;

import com.balance.app.service.DomainException;
import com.balance.app.service.Money;
import jakarta.validation.constraints.*;
import java.math.*;
import java.time.*;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** A hypothetical monthly plan. Does not reserve money or change a saved goal. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class SavingsPlanningService {
  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private final SavingsService savings;
  private final Clock clock;

  public SavingsPlanningService(SavingsService savings, @Value("${balance.time-zone:Europe/Berlin}") String zone) {
    this.savings = savings;
    this.clock = Clock.system(ZoneId.of(zone));
  }

  public record Input(
      @NotNull UUID goalId,
      @NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal expectedIncome,
      @NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal mandatoryPayments,
      @NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal personalSpending) {}

  public record Result(UUID goalId, BigDecimal expectedIncome, BigDecimal mandatoryPayments,
      BigDecimal personalSpending, BigDecimal otherGoalsMonthly, BigDecimal available,
      BigDecimal budgetGap, BigDecimal remaining, BigDecimal requiredMonthly,
      BigDecimal recommended, BigDecimal shortfall, BigDecimal monthsNeeded,
      LocalDate estimatedDate, LocalDate deadline, boolean feasible) {}

  public Result calculate(Input input) {
    var goal = savings.get(input.goalId());
    if (!"ACTIVE".equals(goal.status())) throw DomainException.invalid("Выберите активную цель.");
    var otherPlans = savings.list().stream()
        .filter(g -> !g.id().equals(goal.id()) && "ACTIVE".equals(g.status()) && g.forecast().remaining().signum()>0)
        .map(SavingsDto.View::monthlyPlan).reduce(ZERO, BigDecimal::add);
    return calculate(input, goal, otherPlans, LocalDate.now(clock));
  }

  static Result calculate(Input input, SavingsDto.View goal, BigDecimal otherPlans, LocalDate today) {
    var income = nonNegative(input.expectedIncome());
    var mandatory = nonNegative(input.mandatoryPayments());
    var personal = nonNegative(input.personalSpending());
    return forecast(goal, income, mandatory, personal, otherPlans, today);
  }

  static Result fromAvailable(SavingsDto.View goal, BigDecimal available, BigDecimal otherPlans, LocalDate today) {
    return forecast(goal, available, ZERO, ZERO, otherPlans, today);
  }

  private static Result forecast(SavingsDto.View goal, BigDecimal income, BigDecimal mandatory,
      BigDecimal personal, BigDecimal otherPlans, LocalDate today) {
    var available = income.subtract(mandatory).subtract(personal).subtract(otherPlans);
    var gap = available.negate().max(ZERO);
    available = available.max(ZERO);
    var remaining = goal.forecast().remaining().max(ZERO);
    Long months = SavingsMapper.contributionMonths(today,goal.deadline());
    var required = months==null ? null : remaining.divide(BigDecimal.valueOf(Math.max(1,months)),2,RoundingMode.CEILING);
    var recommended = available.min(remaining);
    if (required!=null) recommended=recommended.min(required);
    BigDecimal needed = remaining.signum()==0 ? BigDecimal.ZERO : recommended.signum()==0 ? null : remaining.divide(recommended,0,RoundingMode.CEILING);
    LocalDate estimated = null;
    if (needed!=null && needed.compareTo(BigDecimal.valueOf(119987))<=0) {
      try { estimated=today.plusMonths(Math.max(0,needed.longValueExact()-1)); if(estimated.getYear()>9999)estimated=null; }
      catch(DateTimeException | ArithmeticException ignored) { /* Outside supported calendar. */ }
    }
    boolean feasible=remaining.signum()==0 || gap.signum()==0 && recommended.signum()>0 &&
        (goal.deadline()==null || !goal.deadline().isBefore(today) && required.compareTo(available)<=0);
    return new Result(goal.id(),income,mandatory,personal,otherPlans,available,gap,remaining,required,
        recommended,required==null?ZERO:required.subtract(available).max(ZERO),needed,estimated,goal.deadline(),feasible);
  }

  private static BigDecimal nonNegative(BigDecimal amount) {
    var value=Money.amount(amount,false);
    if(value.signum()<0)throw DomainException.invalid("Сумма не может быть отрицательной.");
    return value;
  }
}
