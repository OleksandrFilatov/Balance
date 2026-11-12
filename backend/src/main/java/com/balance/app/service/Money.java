package com.balance.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

public final class Money {
  private Money() {}

  public static BigDecimal amount(BigDecimal value, boolean positive) {
    if (value == null) throw DomainException.invalid("Amount is required");
    if (positive && value.signum() <= 0) throw DomainException.invalid("Amount must be positive");
    try {
      BigDecimal scaled = value.setScale(2, RoundingMode.UNNECESSARY);
      if (scaled.precision() > 19) throw DomainException.invalid("Amount exceeds numeric(19,2)");
      return scaled;
    } catch (ArithmeticException e) {
      throw DomainException.invalid("At most two decimal places are allowed");
    }
  }

  public static String currency(String value) {
    try {
      if (value == null
          || !value.matches("[A-Z]{3}")
          || Currency.getInstance(value).getDefaultFractionDigits() != 2)
        throw DomainException.invalid("Use an ISO 4217 currency with two decimal places");
      return value;
    } catch (IllegalArgumentException e) {
      throw DomainException.invalid("Unknown currency");
    }
  }

  public static String name(String value) {
    if (value == null || value.isBlank() || value.strip().length() > 100)
      throw DomainException.invalid("Name must contain 1 to 100 characters");
    return value.strip();
  }

  public static void version(long actual, Long expected) {
    if (expected == null || expected != actual)
      throw DomainException.conflict("Stale version; reload the resource");
  }
}
