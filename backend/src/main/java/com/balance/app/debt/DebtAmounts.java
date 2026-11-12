package com.balance.app.debt;

import java.math.BigDecimal;

/** Known amount of the next obligation; never invent interest for unknown bank terms. */
public final class DebtAmounts {
 private DebtAmounts() {}
 public static boolean interestFree(DebtDto.Terms terms){return terms.annualRate()!=null?terms.annualRate().signum()==0:!"BANK_LOAN".equals(terms.kind());}
 public static BigDecimal due(DebtDto.View debt,BigDecimal paidAtDate){
  var monthly=debt.terms().monthlyPayment();
  if(monthly==null)return interestFree(debt.terms())?debt.remaining():null;
  var amount=monthly.subtract(paidAtDate).max(BigDecimal.ZERO);
  return interestFree(debt.terms())?amount.min(debt.remaining()):amount;
 }
}
