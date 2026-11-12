package com.balance.app.account;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class HouseholdPlanTest {
 @Test void proportionalSharesConserveEveryCent() {
  var total=new BigDecimal("999.99");var mine=HouseholdPlanService.share(total,new BigDecimal("2000"),new BigDecimal("1000"));
  assertEquals(new BigDecimal("666.66"),mine);assertEquals(new BigDecimal("333.33"),total.subtract(mine));
 }
 @Test void zeroSalariesDoNotInventShares() {assertNull(HouseholdPlanService.share(BigDecimal.TEN,BigDecimal.ZERO,BigDecimal.ZERO));}
 @Test void singleEarnerCoversFullAmount() {assertEquals(new BigDecimal("10.00"),HouseholdPlanService.share(BigDecimal.TEN,BigDecimal.ONE,BigDecimal.ZERO));}
 @Test void oddCentIsAssignedOnce() {var total=new BigDecimal("0.01");var mine=HouseholdPlanService.share(total,BigDecimal.ONE,BigDecimal.ONE);assertEquals(total,mine.add(total.subtract(mine)));}
}
