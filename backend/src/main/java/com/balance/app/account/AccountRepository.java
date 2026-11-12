package com.balance.app.account;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends JpaRepository<Account, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Account a where a.id = :id")
  Optional<Account> lock(@Param("id") UUID id);

  @Query(
      value =
          """
          select a.id as accountId, a.currency as currency,
                 a.initial_balance + coalesce(sum(case when t.credit_account_id = a.id then t.amount else -t.amount end), 0) as balance
          from accounts a left join financial_transactions t
            on (t.debit_account_id = a.id or t.credit_account_id = a.id)
            and t.status = 'CONFIRMED' and t.deleted = false
          group by a.id, a.currency, a.initial_balance order by a.created_at, a.id
          """,
      nativeQuery = true)
  List<BalanceRow> balances();

  interface BalanceRow {
    UUID getAccountId();

    String getCurrency();

    java.math.BigDecimal getBalance();
  }
}
