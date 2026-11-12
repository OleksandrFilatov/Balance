package com.balance.app.account;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class PersonalMoneyDto {
  public record DefaultAccount(UUID accountId) {}

  public record Opening(
      UUID accountId, BigDecimal original, BigDecimal effective, String currency) {}

  public record CorrectOpening(
      @NotNull @Digits(integer = 17, fraction = 2) BigDecimal expected,
      @NotNull @Digits(integer = 17, fraction = 2) BigDecimal corrected,
      @NotBlank @Size(max = 500) String reason) {}

  public record Overview(
      String currency,
      LocalDate asOf,
      LocalDate until,
      BigDecimal balance,
      BigDecimal income,
      BigDecimal expense,
      BigDecimal mandatory,
      BigDecimal afterMandatory,
      long unknownObligations,
      UUID defaultAccountId, List<Deduction> deductions) {
    /** A presentation split of the same obligations; never an extra debit or balance. */
    @com.fasterxml.jackson.annotation.JsonProperty("breakdown")
    public PaymentBreakdown breakdown() {
      return new PaymentBreakdown(part("DEBT"), part("HOUSEHOLD"), part("PERSONAL"),
          mandatory, unknownObligations == 0);
    }

    private PaymentPart part(String type) {
      var lines = deductions.stream().filter(d -> type.equals(d.type())).toList();
      var amount = lines.stream().map(Deduction::amount).filter(Objects::nonNull)
          .reduce(new BigDecimal("0.00"), BigDecimal::add);
      return new PaymentPart(amount, lines.stream().noneMatch(d -> d.amount() == null));
    }
  }

  public record PaymentPart(BigDecimal amount, boolean complete) {}
  public record PaymentBreakdown(PaymentPart debts, PaymentPart household, PaymentPart personal,
      BigDecimal total, boolean complete) {}

  public record Deduction(String type,String name,LocalDate date,BigDecimal amount,String href) {}

  public record Section(String key, String name, UUID categoryId, BigDecimal spent) {}

  public record Household(String month, BigDecimal spent, List<Section> sections) {}
}
