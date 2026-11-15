package com.balance.app.service;
import static org.junit.jupiter.api.Assertions.*;
import com.balance.app.account.*;
import com.balance.app.recurring.Recurrence;
import java.math.*;
import java.time.*;
import java.util.Random;
import org.junit.jupiter.api.Test;
class FinancialInvariantTest {
 @Test void householdSharesPreserveEveryCentAcrossTenThousandScenarios(){
  var random=new Random(904713);
  for(int i=0;i<10000;i++){
   var total=BigDecimal.valueOf(random.nextInt(1000000),2);var mine=BigDecimal.valueOf(random.nextInt(1000000),2);var partner=BigDecimal.valueOf(random.nextInt(1000000)+1,2);
   var share=HouseholdPlanService.share(total,mine,partner);assertEquals(total,share.add(total.subtract(share)));assertTrue(share.signum()>=0&&share.compareTo(total)<=0);
   var half=HouseholdSplit.half(total);assertEquals(total,half.add(total.subtract(half)));assertTrue(half.subtract(total.subtract(half)).abs().compareTo(new BigDecimal("0.01"))<=0);
  }
 }
 @Test void recurrenceCountsMatchEnumeratedDatesAtMonthEndsAndLeapDays(){
  var recurrence=new Recurrence();
  for(var anchor:new LocalDate[]{LocalDate.of(2024,1,31),LocalDate.of(2024,2,29),LocalDate.of(2026,11,30)})
   for(var f:Recurrence.Frequency.values())for(int offset:new int[]{0,10,40})for(int horizon:new int[]{1,40,400}){
    var from=anchor.plusDays(offset);var through=from.plusDays(horizon);var end=anchor.plusDays(300);long enumerated=0;
    for(long i=0;;i++){var date=recurrence.at(anchor,f,i,end);if(date==null||date.isAfter(through))break;if(!date.isBefore(from))enumerated++;}
    assertEquals(enumerated,recurrence.count(anchor,f,from,through,end),anchor+" "+f+" "+from);
   }
 }
}
