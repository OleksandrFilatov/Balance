package com.balance.app.calendar;

import static com.balance.app.calendar.CalendarDto.*;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CalendarMapper {
  /** Events are preselected debts and household expenses; completed/cancelled plans are not due. */
  public Day day(java.time.LocalDate date, List<Event> events) {
    BigDecimal debt = BigDecimal.ZERO.setScale(2), household = debt, paid = debt;
    long unknown = 0;
    for (var event : events) {
      if (event.status() == Status.CANCELLED || event.flow() != Flow.OUT) continue;
      if (event.amount() == null) { unknown++; continue; }
      if (event.posted()) paid = paid.add(event.amount());
      else if (event.status() == Status.PLANNED || event.status() == Status.OVERDUE) {
        if (event.type() == Type.DEBT) debt = debt.add(event.amount());
        else household = household.add(event.amount());
      }
    }
    return new Day(date, debt, household, unknown>0?null:debt.add(household), paid, unknown, List.copyOf(events), household, true);
  }

  public Day personalDay(Day raw, BigDecimal householdShare, boolean configured) {
    return new Day(raw.date(), raw.debtDue(), householdShare,
        householdShare == null||raw.unknownAmounts()>0 ? null : raw.debtDue().add(householdShare), raw.paid(),
        raw.unknownAmounts(), raw.events(), raw.householdDue(), configured);
  }

  public Summary summary(List<Event> events) {
    BigDecimal expected = BigDecimal.ZERO.setScale(2),
        planned = expected,
        in = expected,
        out = expected,
        overdue = expected;
    long unknown = 0;
    for (var e : events) {
      if (e.amount() == null) {
        if (e.status() != Status.CANCELLED) unknown++;
        continue;
      }
      if (e.posted()) {
        if (e.flow() == Flow.IN) in = in.add(e.amount());
        if (e.flow() == Flow.OUT) out = out.add(e.amount());
      } else if (e.status() == Status.PLANNED || e.status() == Status.OVERDUE) {
        if (e.flow() == Flow.IN) expected = expected.add(e.amount());
        if (e.flow() == Flow.OUT) {
          planned = planned.add(e.amount());
          if (e.status() == Status.OVERDUE) overdue = overdue.add(e.amount());
        }
      }
    }
    return new Summary(
        expected,
        planned,
        in,
        out,
        overdue,
        in.subtract(out).add(expected).subtract(planned),
        unknown);
  }
}
