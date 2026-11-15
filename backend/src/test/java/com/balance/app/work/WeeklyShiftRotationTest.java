package com.balance.app.work;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;

class WeeklyShiftRotationTest {
  final WeeklyShiftRotation pattern = new WeeklyShiftRotation(LocalDate.of(2026,11,9),
      LocalTime.of(6,0),LocalTime.of(14,30),LocalTime.of(14,30),LocalTime.of(23,0));
  @Test void switchesOnMondayAndKeepsTheWholeWeekTogether() {
    for (int i=0;i<7;i++) assertEquals(LocalTime.of(6,0),pattern.start(LocalDate.of(2026,11,9).plusDays(i)));
    for (int i=0;i<7;i++) assertEquals(LocalTime.of(14,30),pattern.start(LocalDate.of(2026,11,16).plusDays(i)));
    assertEquals(LocalTime.of(6,0),pattern.start(LocalDate.of(2026,11,23)));
    assertFalse(pattern.applies(LocalDate.of(2026,11,8)));
  }
  @Test void continuesAcrossMonthAndYearBoundaries() {
    assertEquals(LocalTime.of(14,30),pattern.start(LocalDate.of(2026,11,30)));
    assertEquals(LocalTime.of(14,30),pattern.start(LocalDate.of(2026,12,1)));
    assertEquals(LocalTime.of(14,30),pattern.start(LocalDate.of(2027,1,1)));
    assertEquals(LocalTime.of(6,0),pattern.start(LocalDate.of(2027,1,4)));
    for (var day=LocalDate.of(2026,11,9);day.isBefore(LocalDate.of(2028,4,1));day=day.plusDays(1)) {
      assertEquals(480,WorkCalendarService.minutes(pattern.start(day),pattern.end(day)));
      assertEquals(pattern.start(day),pattern.start(day.plusWeeks(2)));
    }
  }
}
