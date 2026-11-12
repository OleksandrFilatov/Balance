package com.balance.app.recurring;

import com.balance.app.account.HouseholdAutoService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.slf4j.LoggerFactory;

/** The owner enabled monthly payments only; other frequencies retain their previous opt-in. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name="balance.recurring.monthly-auto-enabled",havingValue="true")
public class MonthlyPaymentScheduler {
 private final RecurringService recurring;private final HouseholdAutoService household;
 public MonthlyPaymentScheduler(RecurringService recurring,HouseholdAutoService household){this.recurring=recurring;this.household=household;}
 @Scheduled(initialDelayString="${balance.recurring.monthly-initial-delay-ms:30000}",fixedDelayString="${balance.recurring.poll-ms:60000}")
 public void tick(){
  for(var id:recurring.monthlyDue())try{
   recurring.autoMonthlyOne(id);
  }catch(Exception e){
   try{recurring.failure(id);}catch(Exception ignored){/* Retry the next scheduled pass. */}
   LoggerFactory.getLogger(getClass()).warn("Monthly payment pending for {}",id,e);
  }
  try{household.run();}catch(Exception e){LoggerFactory.getLogger(getClass()).warn("Household monthly payment remains pending",e);}
 }
}
