package com.balance.app.work;

import java.time.*;
import java.time.temporal.*;

/** An optional personal schedule. No rotation is seeded for new installations. */
public record WeeklyShiftRotation(LocalDate anchorMonday, LocalTime firstStart, LocalTime firstEnd,
                                  LocalTime secondStart, LocalTime secondEnd) {
  public boolean applies(LocalDate date) { return !date.isBefore(anchorMonday); }
  public boolean secondWeek(LocalDate date) {
    var monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    return Math.floorMod(ChronoUnit.WEEKS.between(anchorMonday, monday), 2) == 1;
  }
  public LocalTime start(LocalDate date) { return secondWeek(date) ? secondStart : firstStart; }
  public LocalTime end(LocalDate date) { return secondWeek(date) ? secondEnd : firstEnd; }
}
