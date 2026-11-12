package com.balance.app.debt;

import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class DebtMapper {
  public DebtDto.Terms terms(Debt d) {
    return new DebtDto.Terms(
        d.name, d.creditor, d.description, d.kind, d.annualRate, d.monthlyPayment, d.nextPayment);
  }

  public DebtDto.View view(Debt d, BigDecimal paid) {
    BigDecimal remaining = d.openingRemaining.subtract(paid);
    BigDecimal repaid = d.originalAmount.subtract(remaining);
    return new DebtDto.View(
        d.id,
        terms(d),
        d.originalAmount,
        d.openingRemaining,
        d.currency,
        d.origin,
        d.status,
        remaining,
        repaid,
        paid,
        repaid.multiply(new BigDecimal("100")).divide(d.originalAmount, 2, RoundingMode.HALF_UP),
        d.createdAt,
        d.version);
  }

  public DebtDto.Payment payment(DebtPayment p) {
    return new DebtDto.Payment(
        p.id,
        p.debtId,
        p.accountId,
        p.principal,
        p.interest,
        p.principal.add(p.interest),
        p.operationDate,
        p.description,
        p.createdAt,
        p.principalTransactionId,
        p.interestTransactionId,
        false,
        null,
        null);
  }

  public DebtDto.Forecast forecast(Debt d, BigDecimal paid) {
    String assumption =
        "Фиксированная номинальная годовая ставка / 12; проценты на остаток перед платежом, HALF_UP"
            + " до цента; без комиссий, страховок и просрочек. Фактические проценты вводятся"
            + " отдельно.";
    BigDecimal remaining = d.openingRemaining.subtract(paid), interestTotal = BigDecimal.ZERO;
    if (remaining.signum() == 0)
      return new DebtDto.Forecast(assumption, null, true, 0, null, BigDecimal.ZERO, List.of());
    if (d.annualRate == null || d.monthlyPayment == null)
      return new DebtDto.Forecast(
          assumption,
          "Недостаточно данных: укажите известную ставку (включая 0) и ежемесячный платёж.",
          false,
          null,
          null,
          null,
          List.of());
    List<DebtDto.Installment> rows = new ArrayList<>();
    for (int n = 1; n <= 1200; n++) {
      BigDecimal interest =
          remaining.multiply(d.annualRate).divide(new BigDecimal("1200"), 2, RoundingMode.HALF_UP);
      if (d.monthlyPayment.compareTo(interest) <= 0)
        return new DebtDto.Forecast(
            assumption,
            "Платёж не покрывает проценты: погашение не прогнозируется.",
            false,
            null,
            null,
            null,
            rows);
      BigDecimal principal = d.monthlyPayment.subtract(interest).min(remaining);
      remaining = remaining.subtract(principal);
      interestTotal = interestTotal.add(interest);
      LocalDate date = null;
      if (d.nextPayment != null) {
        try {
          date = d.nextPayment.plusMonths(n - 1);
          if (date.getYear() > 9999) date = null;
        } catch (DateTimeException e) {
          date = null;
        }
      }
      rows.add(
          new DebtDto.Installment(
              n, date, principal, interest, principal.add(interest), remaining));
      if (remaining.signum() == 0)
        return new DebtDto.Forecast(
            assumption,
            d.nextPayment == null
                ? "Дата следующего платежа не задана; календарные даты не рассчитаны."
                : null,
            true,
            n,
            date,
            interestTotal,
            rows);
    }
    return new DebtDto.Forecast(
        assumption,
        "Горизонт ограничен 1200 месяцами; остаток не погашен.",
        false,
        null,
        null,
        null,
        rows);
  }
}
