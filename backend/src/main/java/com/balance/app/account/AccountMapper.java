package com.balance.app.account;

import org.springframework.stereotype.Component;

@Component
public class AccountMapper {
  public AccountDto.View view(Account a) {
    return new AccountDto.View(
        a.getId(),
        a.getName(),
        a.getType(),
        a.getCurrency(),
        a.getInitialBalance(),
        a.getCreatedAt(),
        a.isActive(),
        a.getVersion());
  }
}
