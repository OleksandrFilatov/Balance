package com.balance.app.account;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class AccountDto {
  private AccountDto() {}

  public record Create(
      @NotBlank @Size(max = 100) String name,
      @NotNull AccountType type,
      @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
      @NotNull @Digits(integer = 17, fraction = 2) BigDecimal initialBalance) {}

  public record Update(
      @NotBlank @Size(max = 100) String name,
      @NotNull AccountType type,
      @NotNull Boolean active,
      @NotNull @PositiveOrZero Long version) {}

  public record View(
      UUID id,
      String name,
      AccountType type,
      String currency,
      BigDecimal initialBalance,
      Instant createdAt,
      boolean active,
      long version) {}

  public record Balance(UUID accountId, String currency, BigDecimal balance) {}

  public record Balances(List<Balance> accounts, Map<String, BigDecimal> totalsByCurrency) {}
}
