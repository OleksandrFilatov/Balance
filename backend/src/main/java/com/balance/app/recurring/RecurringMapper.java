package com.balance.app.recurring;

import org.springframework.stereotype.Component;

@Component
public class RecurringMapper {
  public RecurringDto.View view(RecurringTemplate r) {
    return new RecurringDto.View(
        r.id,
        new RecurringDto.Write(
            r.name,
            r.description,
            r.type,
            r.amount,
            r.accountId,
            r.categoryId,
            r.scope,
            r.frequency,
            r.firstDate,
            r.automatic,
            r.householdSplit,r.householdSplit==com.balance.app.account.HouseholdSplit.PROPORTIONAL?"FIXED":"EXTRA",r.endDate),
        r.currency,
        r.status,
        r.originalFirstDate,
        r.nextDate,
        r.version,
        r.lastError, r.deleted);
  }

  public RecurringDto.Planned planned(
      RecurringTemplate r, java.time.LocalDate date, boolean overdue) {
    return new RecurringDto.Planned(
        r.id, r.name, r.type, r.amount, r.currency, r.accountId, date, overdue);
  }
}
