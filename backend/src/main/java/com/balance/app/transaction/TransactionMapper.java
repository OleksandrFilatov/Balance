package com.balance.app.transaction;

import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {
  public TransactionDto.View view(FinancialTransaction t) {
    return new TransactionDto.View(
        t.getId(),
        t.getType(),
        t.getAmount(),
        t.getCurrency(),
        t.getDebitAccount() == null ? null : t.getDebitAccount().getId(),
        t.getCreditAccount() == null ? null : t.getCreditAccount().getId(),
        t.getCategory() == null ? null : t.getCategory().getId(),
        t.getScope(),
        t.getOperationDate(),
        t.getDescription(),
        t.getStatus(),
        t.getCreatedAt(),
        t.getUpdatedAt(),
        t.getVersion(),
        t.getDebtId(),
        t.getRecurringId(),t.getHouseholdPaymentId());
  }
}
