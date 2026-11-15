package com.balance.app.account;

import com.balance.app.work.*;
import java.math.BigDecimal;
import java.time.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.event.*;

@Service
public class HouseholdShiftIncomeService {
  public enum Source { MANUAL, SHIFTS }
  public record Estimate(BigDecimal net, String status, Integer taxYear) {}
  private final JdbcTemplate jdbc;
  private final WorkCalendarService work;
  private final HouseholdBillingService bills;
  private final HouseholdDeferralService deferrals;

  public HouseholdShiftIncomeService(JdbcTemplate jdbc, WorkCalendarService work,
      HouseholdBillingService bills, HouseholdDeferralService deferrals) {
    this.jdbc=jdbc; this.work=work; this.bills=bills; this.deferrals=deferrals;
  }

  public Estimate estimate(String month) {
    var payroll=work.get(month).payroll();
    return new Estimate(payroll.net(),payroll.status(),payroll.taxYear());
  }

  public boolean locked(YearMonth month) {
    return deferrals.hasPlan(month)||jdbc.queryForObject("select count(*) from household_bill_payments where month=? and cancelled_at is null",Long.class,month.atDay(1))>0;
  }

  @TransactionalEventListener(phase=TransactionPhase.BEFORE_COMMIT)
  @Transactional(propagation=Propagation.MANDATORY)
  public void workChanged(WorkCalendarChanged event) {
    var current=YearMonth.now(ZoneId.of("Europe/Berlin"));
    var from=YearMonth.parse(event.month());
    if(from.isBefore(current))from=current;
    jdbc.queryForList("select pg_advisory_xact_lock(729145064)");
    for(var date:jdbc.queryForList("select month from household_monthly_income where mine_source='SHIFTS' and month>=? order by month",LocalDate.class,from.atDay(1))) {
      var month=YearMonth.from(date);
      if(locked(month))continue;
      var net=estimate(month.toString()).net();
      if(net==null)continue; // An unsupported tax year is never silently replaced with gross pay.
      var prior=jdbc.queryForObject("select mine from household_monthly_income where month=?",BigDecimal.class,date);
      if(net.compareTo(prior)==0)continue;
      bills.preservePast();
      jdbc.update("update household_monthly_income set mine=?,version=version+1 where month=? and mine_source='SHIFTS'",net,date);
      bills.incomeChanged(month.toString());
    }
  }
}
