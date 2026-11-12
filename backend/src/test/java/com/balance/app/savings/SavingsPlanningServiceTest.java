package com.balance.app.savings;

import static org.junit.jupiter.api.Assertions.*;
import com.balance.app.service.DomainException;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SavingsPlanningServiceTest {
  static final LocalDate TODAY=LocalDate.of(2026,11,8);
  static BigDecimal amount(String value){return new BigDecimal(value);}
  static void equal(String expected,BigDecimal actual){assertEquals(0,amount(expected).compareTo(actual));}
  SavingsDto.View goal(String target,String actual,LocalDate deadline){
    var g=new SavingsGoal();g.id=UUID.randomUUID();g.name="Goal";g.description="";g.target=amount(target);g.currency="EUR";g.deadline=deadline;g.monthlyPlan=amount("0");g.createdAt=TODAY.atStartOfDay(ZoneOffset.UTC).toInstant();g.status="ACTIVE";g.version=0L;
    return new SavingsMapper().view(g,amount(actual),TODAY);
  }
  SavingsPlanningService.Result calculate(SavingsDto.View goal,String income,String mandatory,String personal,String others){return SavingsPlanningService.calculate(new SavingsPlanningService.Input(goal.id(),amount(income),amount(mandatory),amount(personal)),goal,amount(others),TODAY);}
  @Test void reservesPersonalShareAndOtherGoalPlansBeforeRecommendation(){
    var r=calculate(goal("1000","0",TODAY.plusMonths(4)),"1300","503.28","200","50");equal("546.72",r.available());equal("200",r.requiredMonthly());equal("200",r.recommended());equal("5",r.monthsNeeded());assertEquals(TODAY.plusMonths(4),r.estimatedDate());assertTrue(r.feasible());
  }
  @Test void insufficientPlanShowsShortfallAndRealisticLaterDate(){
    var r=calculate(goal("1000","0",TODAY.plusMonths(1)),"800","500","200","0");equal("100",r.recommended());equal("400",r.shortfall());equal("10",r.monthsNeeded());assertEquals(TODAY.plusMonths(9),r.estimatedDate());assertFalse(r.feasible());
  }
  @Test void deficitNeverBecomesNegativeSaving(){
    var r=calculate(goal("1000","0",null),"100","200","50","25");equal("0",r.available());equal("0",r.recommended());equal("175",r.budgetGap());assertNull(r.monthsNeeded());assertNull(r.estimatedDate());assertFalse(r.feasible());
  }
  @Test void alreadyFundedGoalRequiresNoNewMoney(){
    var r=calculate(goal("1000","1200",TODAY.minusDays(1)),"500","0","0","0");equal("0",r.remaining());equal("0",r.recommended());equal("0",r.monthsNeeded());assertEquals(TODAY,r.estimatedDate());assertTrue(r.feasible());
  }
  @Test void unknownDeadlineUsesAvailableAmountWithoutInventingTargetDate(){
    var r=calculate(goal("1000","0",null),"700","200","100","100");assertNull(r.deadline());assertNull(r.requiredMonthly());equal("300",r.recommended());equal("4",r.monthsNeeded());assertEquals(TODAY.plusMonths(3),r.estimatedDate());
  }
  @Test void roundsUpToCentsAndExcludesContributionAfterDeadline(){
    var g=goal("100.01","0",LocalDate.of(2027,1,1));var r=calculate(g,"200","0","0","0");equal("50.01",r.requiredMonthly());equal("50.01",g.forecast().requiredMonthly());equal("50.01",r.recommended());assertEquals(LocalDate.of(2026,12,8),r.estimatedDate());
  }
  @Test void planElapsedMonthsUseBerlinAtUtcMonthBoundary(){
    var g=new SavingsGoal();g.id=UUID.randomUUID();g.name="Month boundary";g.description="";g.target=amount("1000");g.currency="EUR";g.monthlyPlan=amount("100");g.createdAt=Instant.parse("2026-10-31T23:30:00Z");g.status="ACTIVE";g.version=0L;
    equal("100",new SavingsMapper().view(g,BigDecimal.ZERO,LocalDate.of(2026,11,1)).forecast().plannedToDate());
  }
  @Test void overdueGoalIsNotReportedOnTrack(){var r=calculate(goal("100","0",TODAY.minusDays(1)),"200","0","0","0");assertFalse(r.feasible());}
  @Test void rejectsNegativeOrOverPreciseInputs(){var g=goal("100","0",null);assertThrows(DomainException.class,()->calculate(g,"-1","0","0","0"));assertThrows(DomainException.class,()->calculate(g,"1.001","0","0","0"));}
}
