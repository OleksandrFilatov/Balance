package com.balance.app.calendar;

import com.balance.app.debt.DebtDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class CalendarDto {
  public enum Type {
    ADJUSTMENT,
    INCOME,
    EXPENSE,
    DEBT,
    TRANSFER,
    LOAN,
    REVERSAL
  }

  public enum Status {
    PLANNED,
    COMPLETED,
    OVERDUE,
    CANCELLED
  }

  public enum Source {
    RECURRING,
    DEBT,
    DEBT_PAYMENT,
    DEBT_REVERSAL,
    TRANSACTION
  }

  public enum Flow {
    IN,
    OUT,
    INTERNAL
  }

  public record Event(
      String id,
      LocalDate date,
      LocalDate scheduledDate,
      String title,
      Type type,
      Status status,
      Source source,
      UUID sourceId,
      UUID transactionId,
      UUID paymentId,
      UUID accountId,
      BigDecimal amount,
      String currency,
      Flow flow,
      boolean posted,
      boolean canConfirm,
      boolean canCancel,
      Long version,
      String note) {}

  public record Summary(
      BigDecimal expectedIncome,
      BigDecimal plannedOutflow,
      BigDecimal actualIncome,
      BigDecimal actualPaid,
      BigDecimal overdueOutflow,
      BigDecimal projectedCashFlow,
      long unknownAmounts) {}

  public record Report(
      LocalDate from,
      LocalDate to,
      LocalDate asOf,
      String zone,
      String currency,
      Summary summary,
      List<Event> events,
      List<Event> backlog) {}

  public record DebtConfirm(
      @NotNull LocalDate occurrenceDate,
      @NotNull @PositiveOrZero Long version,
      @NotNull @Valid DebtDto.Pay payment) {}

  public record Day(
      LocalDate date, BigDecimal debtDue, BigDecimal householdDue, BigDecimal totalDue,
      BigDecimal paid, long unknownAmounts, List<Event> events,
      BigDecimal householdTotal, boolean householdConfigured) {}

  public record Obligations(
      LocalDate from, LocalDate to, LocalDate asOf, String currency, List<Day> days) {}
}
