package com.balance.app.recurring;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "balance.recurring.auto-enabled", havingValue = "true")
public class RecurringScheduler {
  private final RecurringService service;
  private final com.balance.app.account.HouseholdAutoService household;

  public RecurringScheduler(RecurringService s,com.balance.app.account.HouseholdAutoService household) {
    service = s;
    this.household=household;
  }

  @Scheduled(fixedDelayString = "${balance.recurring.poll-ms:60000}")
  public void tick() {
    for (var id : service.automaticDue()) {
      try {
        service.autoOne(id);
      } catch (Exception e) {
        LoggerFactory.getLogger(getClass()).warn("Recurring execution failed for {}", id);
        try {
          service.failure(id);
        } catch (Exception record) {
          LoggerFactory.getLogger(getClass()).warn("Could not record recurring failure for {}", id);
        }
      }
    }
    try{household.run();}catch(Exception e){LoggerFactory.getLogger(getClass()).warn("Household automatic payment deferred; no partial transaction was committed",e);}
  }
}
