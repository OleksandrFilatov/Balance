package com.balance.app.account;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;
import java.util.UUID;

/** A reservation of responsibility, never a movement of bank money. */
public enum HouseholdSplit {
  PROPORTIONAL, EQUAL;

  private static final Set<UUID> FIXED = Set.of(
      UUID.fromString("00000000-0000-0000-0004-000000000001"),
      UUID.fromString("00000000-0000-0000-0001-000000000001"),
      UUID.fromString("00000000-0000-0000-0001-000000000002"),
      UUID.fromString("00000000-0000-0000-0001-000000000003"),
      UUID.fromString("00000000-0000-0000-0001-000000000004"));

  public static boolean fixedCategory(UUID category) { return FIXED.contains(category); }

  /** The owner's share receives the odd cent; Ira always gets the exact complement. */
  public static BigDecimal half(BigDecimal amount) {
    return amount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
  }
}
