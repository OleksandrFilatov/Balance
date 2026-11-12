package com.balance.app.transaction;

import com.balance.app.account.Account;
import com.balance.app.category.Category;
import com.balance.app.service.*;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class TransactionValidation {
  public TransactionDto.Write normalize(TransactionDto.Write r) {
    if (r == null || r.type() == null || r.status() == null || r.operationDate() == null)
      throw DomainException.invalid("Type, status and operationDate are required");
    if (r.operationDate().getYear() < 1 || r.operationDate().getYear() > 9999)
      throw DomainException.invalid("Date year must be between 1 and 9999");
    String description = r.description() == null ? "" : r.description().strip();
    if (description.length() > 2000)
      throw DomainException.invalid("Description exceeds 2000 characters");
    boolean valid =
        switch (r.type()) {
          case LOAN_RECEIPT, DEBT_PRINCIPAL, REVERSAL, OPENING_ADJUSTMENT -> false;
          case INCOME ->
              r.debitAccountId() == null
                  && r.creditAccountId() != null
                  && r.categoryId() != null
                  && r.scope() != null;
          case EXPENSE ->
              r.debitAccountId() != null
                  && r.creditAccountId() == null
                  && r.categoryId() != null
                  && r.scope() != null;
          case TRANSFER ->
              r.debitAccountId() != null
                  && r.creditAccountId() != null
                  && !r.debitAccountId().equals(r.creditAccountId())
                  && r.categoryId() == null
                  && r.scope() == null;
        };
    if (!valid)
      throw DomainException.invalid("Invalid accounts, category or scope for transaction type");
    return new TransactionDto.Write(
        r.type(),
        Money.amount(r.amount(), true),
        Money.currency(r.currency()),
        r.debitAccountId(),
        r.creditAccountId(),
        r.categoryId(),
        r.scope(),
        r.operationDate(),
        description,
        r.status());
  }

  public void references(
      TransactionDto.Write r,
      Account debit,
      Account credit,
      Category category,
      FinancialTransaction previous) {
    references(r, debit, credit, category, previous, false);
  }

  public void references(
      TransactionDto.Write r,
      Account debit,
      Account credit,
      Category category,
      FinancialTransaction previous,
      boolean scheduledCategory) {
    for (Account a : new Account[] {debit, credit}) {
      if (a == null) continue;
      if (!a.getCurrency().equals(r.currency()))
        throw DomainException.invalid("Account and transaction currencies must match");
      // Archived references may be retained when correcting history, but not newly selected.
      boolean retained =
          previous != null
              && (Objects.equals(id(previous.getDebitAccount()), a.getId())
                  || Objects.equals(id(previous.getCreditAccount()), a.getId()));
      if (!a.isActive() && !retained) throw DomainException.invalid("Account is inactive");
    }
    if (category != null) {
      if (category.getType() != r.type())
        throw DomainException.invalid("Category does not match transaction type");
      boolean retained =
          scheduledCategory
              || previous != null
                  && previous.getCategory() != null
                  && previous.getCategory().getId().equals(category.getId());
      if (!category.isActive() && !retained) throw DomainException.invalid("Category is inactive");
    }
  }

  private java.util.UUID id(Account a) {
    return a == null ? null : a.getId();
  }
}
