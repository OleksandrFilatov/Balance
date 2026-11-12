package com.balance.app.budget;

import com.balance.app.transaction.FinanceScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class BudgetDto {
  public record Limit(
      @NotNull UUID categoryId,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal amount) {}

  public record Plan(
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal plannedIncome,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal plannedExpense,
      @NotNull @Size(max = 1000) List<@NotNull @Valid Limit> limits) {}

  public record Create(
      @NotBlank String month, @NotNull FinanceScope scope, @NotNull @Valid Plan plan) {}

  public record Update(@NotNull @PositiveOrZero Long version, @NotNull @Valid Plan plan) {}

  public record Copy(
      @NotBlank String sourceMonth, @NotBlank String targetMonth, @NotNull FinanceScope scope) {}

  public record View(
      UUID id,
      String month,
      FinanceScope scope,
      String currency,
      Plan plan,
      long version,
      Instant createdAt,
      Instant updatedAt) {}

  public record Category(
      UUID categoryId,
      String name,
      boolean active,
      BigDecimal planned,
      BigDecimal actual,
      BigDecimal remaining,
      BigDecimal usagePercent,
      BigDecimal deviation,
      boolean exceeded) {}

  public record Report(
      String month,
      FinanceScope scope,
      String currency,
      View budget,
      BigDecimal actualIncome,
      BigDecimal actualExpense,
      BigDecimal remaining,
      BigDecimal usagePercent,
      BigDecimal incomeDeviation,
      BigDecimal expenseDeviation,
      BigDecimal allocatedPlan,
      BigDecimal unallocatedPlan,
      BigDecimal expensesWithoutLimit,
      boolean exceeded,
      List<Category> categories) {}
}
