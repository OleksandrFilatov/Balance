package com.balance.app.savings;
import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
class SavingsScheduleTest {
 static BigDecimal n(String s){return new BigDecimal(s);}
 @Test void automaticDatesAndLastCentAreExact(){
  var start=LocalDate.of(2026,11,14);var end=LocalDate.of(2027,1,14);
  assertEquals(n("100.01"),SavingsSchedule.monthly(n("300.01"),n("0"),start,end));
  assertEquals(n("60.01"),SavingsSchedule.due(n("300.01"),n("0"),start,end,LocalDate.of(2026,11,30),n("40")));
  assertEquals(n("260.01"),SavingsSchedule.due(n("300.01"),n("0"),start,end,end,n("40")));
  assertEquals(n("0.00"),SavingsSchedule.due(n("300.01"),n("0"),start,end,start.minusDays(1),n("0")));
 }
 @Test void noContributionsAreScheduledAfterDeadlineAndManualPlanIsCapped(){
  var start=LocalDate.of(2026,11,14);var end=LocalDate.of(2027,4,1);
  assertEquals(5,SavingsSchedule.count(start,end));assertEquals(n("600.00"),SavingsSchedule.monthly(n("3000"),n("0"),start,end));
  assertEquals(n("3000"),SavingsSchedule.due(n("3000"),n("2000"),start,end,end,n("0")));
  assertEquals(n("0.00"),SavingsSchedule.due(n("3000"),n("2000"),start,end,end,n("3500")));
 }
 @Test void shortMonthsAndUndatedZeroPlanAreHandled(){
  var start=LocalDate.of(2027,1,31);assertEquals(2,SavingsSchedule.count(start,LocalDate.of(2027,2,28)));
  assertEquals(n("0.00"),SavingsSchedule.monthly(n("100"),n("0"),start,null));
 }
}
