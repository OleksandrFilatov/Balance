package com.balance.app.savings;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class SavingsDto {
  public record Write(
      @NotBlank @Size(max = 100) String name,
      @Size(max = 2000) String description,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal target,
      @NotNull @Pattern(regexp = "EUR") String currency,
      LocalDate deadline,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal monthlyPlan) {}

  public record Update(
      @NotNull @jakarta.validation.Valid Write goal,
      @NotNull Long version,
      @NotNull @Pattern(regexp = "ACTIVE|ARCHIVED|ACHIEVED") String status) {}

  public record Move(
      @NotNull UUID accountId,
      @NotNull UUID fromGoalId,
      UUID toGoalId,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal amount,
      @Size(max = 2000) String note) {}

  public record Funding(
      @NotNull UUID accountId,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal amount,
      @Size(max = 2000) String note) {}

  public record Forecast(
      BigDecimal remaining,
      BigDecimal percent,
      BigDecimal requiredMonthly,
      BigDecimal monthsNeeded,
      LocalDate estimatedDate,
      Long monthsUntilDeadline,
      BigDecimal plannedToDate,
      BigDecimal actual,
      BigDecimal variance,
      boolean overdue) {}

  public record View(
      UUID id,
      String name,
      String description,
      BigDecimal target,
      String currency,
      LocalDate deadline,
      BigDecimal monthlyPlan,
      String status,
      Instant createdAt,
      long version,
      BigDecimal reserved,
      Forecast forecast) {}

  public record Coverage(
      UUID accountId,
      String name,
      String currency,
      BigDecimal balance,
      BigDecimal reserved,
      BigDecimal free,
      boolean underfunded) {}

  public record Overview(
      BigDecimal reserved,
      BigDecimal free,
      BigDecimal balance,
      long activeGoals,
      List<Coverage> accounts) {}

  public record History(
      UUID id,
      UUID accountId,
      BigDecimal amount,
      String action,
      String note,
      Instant createdAt,
      UUID commandId) {}

  public record HistoryPage(List<History> content, int page, int size, long totalElements) {}
}
