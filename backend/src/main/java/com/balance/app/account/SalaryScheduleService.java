package com.balance.app.account;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Earnings and cash dates are independent. This service never posts an income. */
@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class SalaryScheduleService {
  private final JdbcTemplate jdbc;
  public SalaryScheduleService(JdbcTemplate jdbc){this.jdbc=jdbc;}
  public record Receipt(String workMonth,LocalDate date,BigDecimal amount){}
  public static LocalDate defaultDate(YearMonth work){
    return work.getYear()==9999&&work.getMonthValue()==12?work.atEndOfMonth():work.plusMonths(1).atDay(15);
  }
  public List<Receipt> receipts(YearMonth cashMonth){
    var candidates=jdbc.query("select month,mine,mine_receipt_date from household_monthly_income where month<=? and mine>0 and (mine_receipt_date between ? and ? or mine_receipt_date is null and month=?) order by month",
        (rs,n)->{var work=YearMonth.from(rs.getObject("month",LocalDate.class));var date=rs.getObject("mine_receipt_date",LocalDate.class);return new Receipt(work.toString(),date==null?defaultDate(work):date,rs.getBigDecimal("mine"));},cashMonth.atEndOfMonth(),cashMonth.atDay(1),cashMonth.atEndOfMonth(),cashMonth.minusMonths(1).atDay(1));
    return candidates.stream().filter(r->YearMonth.from(r.date()).equals(cashMonth)).sorted(Comparator.comparing(Receipt::date).thenComparing(Receipt::workMonth)).toList();
  }
  public BigDecimal alreadyReceived(YearMonth cashMonth,String currency){
    return jdbc.queryForObject("select coalesce(sum(amount),0) from financial_transactions where type='INCOME' and status='CONFIRMED' and not deleted and currency=? and operation_date between ? and ?",BigDecimal.class,currency,cashMonth.atDay(1),cashMonth.atEndOfMonth());
  }
  public BigDecimal expected(YearMonth cashMonth,String currency){
    if(!currency.equals("EUR"))return BigDecimal.ZERO;
    return receipts(cashMonth).stream().map(Receipt::amount).reduce(BigDecimal.ZERO,BigDecimal::add).subtract(alreadyReceived(cashMonth,currency)).max(BigDecimal.ZERO);
  }
}
