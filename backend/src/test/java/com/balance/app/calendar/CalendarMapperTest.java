package com.balance.app.calendar;

import static com.balance.app.calendar.CalendarDto.*;
import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;

class CalendarMapperTest {
  final CalendarMapper mapper = new CalendarMapper();

  Event obligation(Type type, String value, Status status, boolean posted) {
    return new Event(UUID.randomUUID().toString(), LocalDate.of(2026,11,7), null, "Payment",
        type, status, type == Type.DEBT ? Source.DEBT : Source.RECURRING, UUID.randomUUID(),
        null, null, null, value == null ? null : new BigDecimal(value), "EUR", Flow.OUT,
        posted, false, false, 0L, "");
  }

  @Test
  void selectedDaySeparatesUnpaidDebtHouseholdAndPaidAndExcludesCancellations() {
    var day = mapper.day(LocalDate.of(2026,11,7), List.of(
        obligation(Type.DEBT,"200.00",Status.OVERDUE,false),
        obligation(Type.EXPENSE,"50.25",Status.PLANNED,false),
        obligation(Type.EXPENSE,"25.00",Status.COMPLETED,true),
        obligation(Type.DEBT,"80.00",Status.CANCELLED,true),
        obligation(Type.EXPENSE,null,Status.CANCELLED,false)));
    assertEquals(new BigDecimal("250.25"),day.totalDue());
    assertEquals(new BigDecimal("200.00"),day.debtDue());
    assertEquals(new BigDecimal("50.25"),day.householdDue());
    assertEquals(new BigDecimal("25.00"),day.paid());
    assertEquals(0,day.unknownAmounts());
    assertEquals(5,day.events().size());
  }

  @Test
  void selectedDayRetainsExactLargeAmountsAndFlagsUnknownDebt() {
    var day = mapper.day(LocalDate.of(2026,11,7), List.of(
        obligation(Type.DEBT,"9999999999999999.99",Status.PLANNED,false),
        obligation(Type.EXPENSE,"0.01",Status.PLANNED,false),
        obligation(Type.DEBT,null,Status.PLANNED,false)));
    assertNull(day.totalDue());
    assertEquals(new BigDecimal("9999999999999999.99"),day.debtDue());
    assertEquals(new BigDecimal("0.01"),day.householdDue());
    assertEquals(1,day.unknownAmounts());
    assertEquals(new BigDecimal("0.00"),mapper.day(LocalDate.of(2026,11,8),List.of()).totalDue());
  }

  Event event(String amount, Flow flow, Status status, boolean posted) {
    return new Event(
        UUID.randomUUID().toString(),
        LocalDate.of(2026, 11, 7),
        null,
        "Test",
        Type.EXPENSE,
        status,
        Source.TRANSACTION,
        UUID.randomUUID(),
        null,
        null,
        null,
        amount == null ? null : new BigDecimal(amount),
        "EUR",
        flow,
        posted,
        false,
        false,
        null,
        "");
  }

  @Test
  void exactCashFlowRetainsCentAboveJavascriptSafeInteger() {
    var s =
        mapper.summary(
            List.of(
                event("10000000000000000.01", Flow.IN, Status.COMPLETED, true),
                event("10000000000000000.00", Flow.OUT, Status.COMPLETED, true)));
    assertEquals(new BigDecimal("0.01"), s.projectedCashFlow());
  }

  @Test
  void CancelledCashPaymentAndItsReversalAreBothRealButDeletedPendingIsNot() {
    var s =
        mapper.summary(
            List.of(
                event("20", Flow.OUT, Status.CANCELLED, true),
                event("20", Flow.IN, Status.COMPLETED, true),
                event("50", Flow.OUT, Status.CANCELLED, false)));
    assertEquals(0, s.projectedCashFlow().signum());
    assertEquals(0, new BigDecimal("20").compareTo(s.actualPaid()));
    assertEquals(0, s.plannedOutflow().signum());
  }

  @Test
  void unknownAmountsAreFlaggedAndTransfersDoNotAlterCashFlow() {
    var s =
        mapper.summary(
            List.of(
                event(null, Flow.OUT, Status.PLANNED, false),
                event("1000", Flow.INTERNAL, Status.COMPLETED, true)));
    assertEquals(1, s.unknownAmounts());
    assertEquals(0, s.projectedCashFlow().signum());
  }
}
