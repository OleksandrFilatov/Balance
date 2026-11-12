package com.balance.app.recurring;

import com.balance.app.transaction.*;
import jakarta.validation.constraints.*;
import java.math.*;
import java.time.*;
import java.util.*;

public final class RecurringDto {
  public record Cancel(
      @NotNull LocalDate occurrenceDate,
      @NotNull @PositiveOrZero Long version,
      @NotBlank @Size(max = 500) String reason) {}

  public record Cancellation(
      UUID id,
      UUID templateId,
      LocalDate occurrenceDate,
      String name,
      BigDecimal amount,
      String currency,
      String reason) {}

  public record Write(
      @NotBlank @Size(max = 100) String name,
      @Size(max = 1500) String description,
      @NotNull TransactionType type,
      @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 17, fraction = 2)
          BigDecimal amount,
      @NotNull UUID accountId,
      @NotNull UUID categoryId,
      @NotNull FinanceScope scope,
      @NotNull Recurrence.Frequency frequency,
      @NotNull LocalDate firstDate,
      boolean automatic,
      com.balance.app.account.HouseholdSplit householdSplit,
      @Pattern(regexp="FIXED|EXTRA") String householdGroup,LocalDate endDate) {
    public Write(String name,String description,TransactionType type,BigDecimal amount,UUID accountId,UUID categoryId,FinanceScope scope,Recurrence.Frequency frequency,LocalDate firstDate,boolean automatic,com.balance.app.account.HouseholdSplit householdSplit,String householdGroup){this(name,description,type,amount,accountId,categoryId,scope,frequency,firstDate,automatic,householdSplit,householdGroup,null);}
    public Write(String name,String description,TransactionType type,BigDecimal amount,
        UUID accountId,UUID categoryId,FinanceScope scope,Recurrence.Frequency frequency,
        LocalDate firstDate,boolean automatic,com.balance.app.account.HouseholdSplit householdSplit){
      this(name,description,type,amount,accountId,categoryId,scope,frequency,firstDate,automatic,householdSplit,null);
    }
    public Write(String name, String description, TransactionType type, BigDecimal amount,
        UUID accountId, UUID categoryId, FinanceScope scope, Recurrence.Frequency frequency,
        LocalDate firstDate, boolean automatic) {
      this(name,description,type,amount,accountId,categoryId,scope,frequency,firstDate,automatic,null);
    }
  }

  public record Update(
      @NotNull @jakarta.validation.Valid Write template,
      @NotNull @PositiveOrZero Long version,
      @NotNull @Pattern(regexp = "ACTIVE|PAUSED|ARCHIVED") String status) {}

  public record Confirm(
      @NotNull LocalDate occurrenceDate,
      LocalDate operationDate,
      @NotNull @PositiveOrZero Long version) {}

  public record View(
      UUID id,
      Write template,
      String currency,
      String status,
      LocalDate originalFirstDate,
      LocalDate nextDate,
      long version,
      String lastError, boolean deleted) {}

  public record Execution(
      UUID id,
      LocalDate occurrenceDate,
      String mode,
      Instant createdAt,
      TransactionDto.View transaction, boolean cancelled, String cancellationReason) {}

  public record CancelPayment(@NotBlank @Size(max=500) String reason) {}

  public record History(List<Execution> content, int page, int size, long totalElements) {}

  public record Planned(
      UUID templateId,
      String name,
      TransactionType type,
      BigDecimal amount,
      String currency,
      UUID accountId,
      LocalDate date,
      boolean overdue) {}

  public record Upcoming(
      LocalDate asOf,
      int days,
      boolean automationEnabled,
      List<Planned> events,
      List<Planned> overdue,
      boolean truncated) {}
  public record MonthPlan(String month,LocalDate asOf,List<Planned> events,List<Planned> overdue,boolean truncated){}
}
