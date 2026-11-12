package com.balance.app.account;

import com.balance.app.service.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountService {
  private final AccountRepository accounts;
  private final AccountMapper mapper;

  public AccountService(AccountRepository accounts, AccountMapper mapper) {
    this.accounts = accounts;
    this.mapper = mapper;
  }

  public AccountDto.View create(AccountDto.Create request) {
    if (request.type() == null) throw DomainException.invalid("Account type is required");
    return mapper.view(
        accounts.saveAndFlush(
            new Account(
                Money.name(request.name()),
                request.type(),
                Money.currency(request.currency()),
                Money.amount(request.initialBalance(), false))));
  }

  @Transactional(readOnly = true)
  public List<AccountDto.View> list() {
    return accounts.findAll(org.springframework.data.domain.Sort.by("createdAt", "id")).stream()
        .map(mapper::view)
        .toList();
  }

  @Transactional(readOnly = true)
  public AccountDto.View get(UUID id) {
    return mapper.view(accounts.findById(id).orElseThrow(() -> DomainException.missing("Account")));
  }

  public AccountDto.View update(UUID id, AccountDto.Update request) {
    Account account = accounts.lock(id).orElseThrow(() -> DomainException.missing("Account"));
    Money.version(account.getVersion(), request.version());
    if (request.type() == null || request.active() == null)
      throw DomainException.invalid("Type and active are required");
    account.update(Money.name(request.name()), request.type(), request.active());
    accounts.flush();
    return mapper.view(account);
  }

  @Transactional(readOnly = true)
  public AccountDto.Balances balances() {
    List<AccountDto.Balance> rows =
        accounts.balances().stream()
            .map(r -> new AccountDto.Balance(r.getAccountId(), r.getCurrency(), r.getBalance()))
            .toList();
    Map<String, BigDecimal> totals = new TreeMap<>();
    rows.forEach(r -> totals.merge(r.currency(), r.balance(), BigDecimal::add));
    return new AccountDto.Balances(rows, totals);
  }

  @Transactional(readOnly = true)
  public AccountDto.Balance balance(UUID id) {
    return balances().accounts().stream()
        .filter(b -> b.accountId().equals(id))
        .findFirst()
        .orElseThrow(() -> DomainException.missing("Account"));
  }
}
