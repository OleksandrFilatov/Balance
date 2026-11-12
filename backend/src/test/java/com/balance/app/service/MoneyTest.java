package com.balance.app.service;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MoneyTest {
  @Test
  void moneyNeverRoundsSilently() {
    assertEquals(new BigDecimal("12.30"), Money.amount(new BigDecimal("12.3"), true));
    assertThrows(DomainException.class, () -> Money.amount(new BigDecimal("1.001"), true));
    assertThrows(
        DomainException.class, () -> Money.amount(new BigDecimal("100000000000000000.00"), true));
    assertThrows(DomainException.class, () -> Money.amount(BigDecimal.ZERO, true));
    assertThrows(DomainException.class, () -> Money.amount(new BigDecimal("-1"), true));
  }

  @Test
  void currencyMustBeSupportedByTwoDecimalMoneyModel() {
    assertEquals("EUR", Money.currency("EUR"));
    assertThrows(DomainException.class, () -> Money.currency("XXX"));
    assertThrows(DomainException.class, () -> Money.currency("JPY"));
    assertThrows(DomainException.class, () -> Money.currency("eur"));
  }
}
