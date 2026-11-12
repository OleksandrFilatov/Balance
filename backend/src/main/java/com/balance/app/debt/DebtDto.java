package com.balance.app.debt;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class DebtDto {
  public record Monthly(
      @NotBlank @Size(max = 100) String name,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal payment,
      @NotNull LocalDate firstDate,
      @NotNull LocalDate endDate,@Size(max=2000) String description) {
    public Monthly(String name,BigDecimal payment,LocalDate firstDate,LocalDate endDate){this(name,payment,firstDate,endDate,"");}
  }

  public record Terms(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Size(max = 100) String creditor,
      @Size(max = 2000) String description,
      @NotNull @Pattern(regexp = "PERSONAL|BANK_LOAN|INSTALLMENT") String kind,
      @DecimalMin("0") @DecimalMax("1000") @Digits(integer = 4, fraction = 4) BigDecimal annualRate,
      @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal monthlyPayment,
      LocalDate nextPayment) {}

  public record Create(
      @NotNull @jakarta.validation.Valid Terms terms,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal originalAmount,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal openingRemaining,
      @NotNull @Pattern(regexp = "EUR") String currency,
      @NotNull @Pattern(regexp = "EXISTING|NEW_LOAN") String origin,
      UUID accountId,
      LocalDate operationDate) {}

  public record Update(
      @NotNull @jakarta.validation.Valid Terms terms,
      @NotNull @PositiveOrZero Long version,
      @NotNull @Pattern(regexp = "ACTIVE|CLOSED|ARCHIVED") String status) {}

  public record Pay(
      @NotNull UUID accountId,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal principal,
      @NotNull @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal interest,
      @NotNull LocalDate operationDate,
      @NotNull com.balance.app.transaction.FinanceScope scope,
      @Size(max = 2000) String description,
      LocalDate nextPayment) {}

  public record View(
      UUID id,
      Terms terms,
      BigDecimal originalAmount,
      BigDecimal openingRemaining,
      String currency,
      String origin,
      String status,
      BigDecimal remaining,
      BigDecimal repaid,
      BigDecimal recordedPrincipal,
      BigDecimal progress,
      Instant createdAt,
      long version) {}

  public record Payment(
      UUID id,
      UUID debtId,
      UUID accountId,
      BigDecimal principal,
      BigDecimal interest,
      BigDecimal total,
      LocalDate operationDate,
      String description,
      Instant createdAt,
      UUID principalTransactionId,
      UUID interestTransactionId,
      boolean reversed,
      LocalDate reversalDate,
      String reversalReason) {}

  public record Reverse(
      @NotNull LocalDate operationDate, @NotBlank @Size(max = 500) String reason) {}

  public record History(List<Payment> content, int page, int size, long totalElements) {}

  public record Installment(
      int number,
      LocalDate date,
      BigDecimal principal,
      BigDecimal interest,
      BigDecimal total,
      BigDecimal remaining) {}

  public record Forecast(
      String assumption,
      String limitation,
      boolean complete,
      Integer months,
      LocalDate payoffDate,
      BigDecimal remainingInterest,
      List<Installment> schedule) {}

  public record Overview(
      String currency,
      BigDecimal remaining,
      long activeDebts,
      BigDecimal monthlyPayments,
      BigDecimal assets,
      BigDecimal netWorth,
      BigDecimal expenses,
      BigDecimal externalOutflow,
      LocalDate from,
      LocalDate to,
      List<View> upcoming) {}
}
