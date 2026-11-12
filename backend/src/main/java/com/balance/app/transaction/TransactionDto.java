package com.balance.app.transaction;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class TransactionDto {
  public record MonthSummary(String month,BigDecimal income,BigDecimal expense,BigDecimal net,BigDecimal personalExpense,BigDecimal householdExpense){}
  private TransactionDto() {}

  public record Write(
      @NotNull TransactionType type,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal amount,
      @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
      UUID debitAccountId,
      UUID creditAccountId,
      UUID categoryId,
      FinanceScope scope,
      @NotNull LocalDate operationDate,
      @Size(max = 2000) String description,
      @NotNull TransactionStatus status) {}

  public record Update(@NotNull @Valid Write transaction, @NotNull @PositiveOrZero Long version) {}

  public record View(
      UUID id,
      TransactionType type,
      BigDecimal amount,
      String currency,
      UUID debitAccountId,
      UUID creditAccountId,
      UUID categoryId,
      FinanceScope scope,
      LocalDate operationDate,
      String description,
      TransactionStatus status,
      Instant createdAt,
      Instant updatedAt,
      long version,
      UUID debtId,
      UUID recurringId, UUID householdPaymentId) {}

  public record Filter(
      LocalDate from,
      LocalDate to,
      UUID categoryId,
      UUID accountId,
      FinanceScope scope,
      TransactionType type,
      TransactionStatus status, Boolean excludeReversed, Boolean excludeAdjustments) {
    public Filter(LocalDate from,LocalDate to,UUID categoryId,UUID accountId,FinanceScope scope,TransactionType type,TransactionStatus status,Boolean excludeReversed){this(from,to,categoryId,accountId,scope,type,status,excludeReversed,false);}
    public Filter(LocalDate from,LocalDate to,UUID categoryId,UUID accountId,FinanceScope scope,TransactionType type,TransactionStatus status){this(from,to,categoryId,accountId,scope,type,status,false);}
  }

  public record Page(List<View> content, int page, int size, long totalElements, int totalPages) {}

  public record Summary(
      LocalDate from,
      LocalDate to,
      String currency,
      BigDecimal income,
      BigDecimal expense,
      BigDecimal net,
      BigDecimal personalExpense,
      BigDecimal householdExpense) {}

  public record Created(View transaction, boolean replay) {}

  public record DailyExpense(LocalDate date, BigDecimal amount) {}

  public record CategoryExpense(UUID categoryId, String name, BigDecimal amount) {}

  public record ExpenseAnalytics(
      LocalDate from,
      LocalDate to,
      String currency,
      List<DailyExpense> daily,
      List<CategoryExpense> categories) {}
}
