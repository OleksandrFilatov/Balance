package com.balance.app.budget;

import java.math.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class BudgetMapper {
  public BudgetDto.View view(Budget b) {
    var limits =
        b.limits.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> new BudgetDto.Limit(e.getKey(), e.getValue()))
            .toList();
    return new BudgetDto.View(
        b.id,
        b.month.toString().substring(0, 7),
        b.scope,
        b.currency,
        new BudgetDto.Plan(b.plannedIncome, b.plannedExpense, limits),
        b.version,
        b.createdAt,
        b.updatedAt);
  }

  public BigDecimal percent(BigDecimal actual, BigDecimal plan) {
    return plan == null || plan.signum() == 0
        ? null
        : actual.multiply(new BigDecimal("100")).divide(plan, 2, RoundingMode.HALF_UP);
  }
}
