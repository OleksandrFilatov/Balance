package com.balance.app.savings;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

@Component
public class SavingsMapper {
  public SavingsDto.View view(SavingsGoal g, BigDecimal actual, LocalDate today) {
    return view(g,actual,today,ZoneId.of("Europe/Berlin"));
  }

  static Long contributionMonths(LocalDate today,LocalDate deadline) {
    if(deadline==null)return null;
    if(deadline.isBefore(today))return 0L;
    long count=ChronoUnit.MONTHS.between(YearMonth.from(today),YearMonth.from(deadline))+1;
    if(count>1&&today.plusMonths(count-1).isAfter(deadline))count--;
    return count;
  }

  public SavingsDto.View view(SavingsGoal g, BigDecimal actual, LocalDate today,ZoneId zone) {
    BigDecimal remaining = g.target.subtract(actual).max(BigDecimal.ZERO);
    BigDecimal percent =
        actual.multiply(new BigDecimal("100")).divide(g.target, 2, RoundingMode.HALF_UP);
    Long available = contributionMonths(today,g.deadline);
    BigDecimal required =
        available == null
            ? null
            : remaining.divide(BigDecimal.valueOf(Math.max(1, available)), 2, RoundingMode.CEILING);
    BigDecimal needed =
        remaining.signum() == 0
            ? BigDecimal.ZERO
            : g.monthlyPlan.signum() == 0
                ? null
                : remaining.divide(g.monthlyPlan, 0, RoundingMode.CEILING);
    LocalDate estimated = null;
    if (needed != null && needed.compareTo(BigDecimal.valueOf(119987)) <= 0) {
      try {
        estimated =
            remaining.signum() == 0
                ? today
                : today.plusMonths(Math.max(0, needed.longValueExact() - 1));
        if (estimated.getYear() > 9999) estimated = null;
      } catch (DateTimeException | ArithmeticException ignored) {
      }
    }
    long elapsed =
        Math.max(
            0,
            ChronoUnit.MONTHS.between(
                    YearMonth.from(g.createdAt.atZone(zone)), YearMonth.from(today))
                + 1);
    BigDecimal planned = g.monthlyPlan.multiply(BigDecimal.valueOf(elapsed)).min(g.target);
    return new SavingsDto.View(
        g.id,
        g.name,
        g.description,
        g.target,
        g.currency,
        g.deadline,
        g.monthlyPlan,
        g.status,
        g.createdAt,
        g.version,
        actual,
        new SavingsDto.Forecast(
            remaining,
            percent,
            required,
            needed,
            estimated,
            available,
            planned,
            actual,
            actual.subtract(planned),
            g.deadline != null && g.deadline.isBefore(today) && remaining.signum() > 0));
  }
}
