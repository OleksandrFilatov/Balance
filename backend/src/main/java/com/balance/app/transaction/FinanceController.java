package com.balance.app.transaction;

import com.balance.app.account.*;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class FinanceController {
  private final AccountService accounts;
  private final TransactionService transactions;

  public FinanceController(AccountService accounts, TransactionService transactions) {
    this.accounts = accounts;
    this.transactions = transactions;
  }

  @GetMapping("/balances")
  public AccountDto.Balances balances() {
    return accounts.balances();
  }

  @GetMapping("/summary")
  public TransactionDto.Summary summary(
      @RequestParam LocalDate from,
      @RequestParam LocalDate to,
      @RequestParam(defaultValue = "EUR") String currency) {
    return transactions.summary(from, to, currency);
  }

  @GetMapping("/summary/expenses")
  public TransactionDto.ExpenseAnalytics expenses(
      @RequestParam LocalDate from,
      @RequestParam LocalDate to,
      @RequestParam(defaultValue = "EUR") String currency) {
    return transactions.expenses(from, to, currency);
  }
  @GetMapping("/summary/monthly")
  public java.util.List<TransactionDto.MonthSummary> months(@RequestParam String month,@RequestParam(defaultValue="EUR")String currency){return transactions.monthlySummary(month,currency);}
}
