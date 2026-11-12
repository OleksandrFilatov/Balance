package com.balance.app.recurring;

import static org.junit.jupiter.api.Assertions.*;

import java.time.*;
import org.junit.jupiter.api.Test;

class RecurrenceTest {
  final Recurrence r = new Recurrence();

  @Test
  void monthEndDoesNotDrift() {
    for (int day : java.util.List.of(29, 30, 31)) {
      LocalDate anchor = LocalDate.of(2025, 1, day);
      assertEquals(LocalDate.of(2025, 2, 28), r.at(anchor, Recurrence.Frequency.MONTHLY, 1));
      assertEquals(LocalDate.of(2025, 3, day), r.at(anchor, Recurrence.Frequency.MONTHLY, 2));
    }
  }

  @Test
  void leapYearsAndQuarterEndsRetainOriginalAnchor() {
    var leap = LocalDate.of(2024, 2, 29);
    assertEquals(LocalDate.of(2025, 2, 28), r.at(leap, Recurrence.Frequency.YEARLY, 1));
    assertEquals(LocalDate.of(2028, 2, 29), r.at(leap, Recurrence.Frequency.YEARLY, 4));
    assertEquals(
        LocalDate.of(2025, 4, 30),
        r.at(LocalDate.of(2025, 1, 31), Recurrence.Frequency.QUARTERLY, 1));
    assertEquals(
        LocalDate.of(2025, 7, 31),
        r.at(LocalDate.of(2025, 1, 31), Recurrence.Frequency.QUARTERLY, 2));
  }

  @Test
  void missedDatesAndWeeklySchedulesDoNotReset() {
    LocalDate start = LocalDate.of(2020, 1, 31), from = LocalDate.of(2026, 3, 1);
    long index = r.onOrAfter(start, Recurrence.Frequency.MONTHLY, from);
    assertEquals(LocalDate.of(2026, 3, 31), r.at(start, Recurrence.Frequency.MONTHLY, index));
    assertEquals(start.plusDays(21), r.at(start, Recurrence.Frequency.WEEKLY, 3));
    assertEquals(start.plusDays(3), r.at(start, Recurrence.Frequency.DAILY, 3));
  }

  @Test
  void exhaustedCalendarDoesNotOverflow() {
    assertNull(r.at(LocalDate.of(9999, 12, 31), Recurrence.Frequency.DAILY, 1));
  }
}
