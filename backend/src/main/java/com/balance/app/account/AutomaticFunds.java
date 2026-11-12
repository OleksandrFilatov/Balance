package com.balance.app.account;

import com.balance.app.service.DomainException;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AutomaticFunds {
 private final AccountRepository accounts;private final AccountService balances;private final JdbcTemplate jdbc;
 public AutomaticFunds(AccountRepository accounts,AccountService balances,JdbcTemplate jdbc){this.accounts=accounts;this.balances=balances;this.jdbc=jdbc;}
 public BigDecimal free(UUID id){var a=accounts.lock(id).orElseThrow(()->DomainException.missing("Account"));if(!a.isActive())throw DomainException.conflict("Счёт для автооплаты неактивен.");var reserved=jdbc.queryForObject("select coalesce(sum(amount),0) from savings_entries where account_id=?",BigDecimal.class,id);return balances.balance(id).balance().subtract(reserved.max(BigDecimal.ZERO)).max(BigDecimal.ZERO);}
}
