package com.balance.app.account;

import java.time.*;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HouseholdAutoService {
 private final JdbcTemplate jdbc;private final HouseholdBillingService billing;private final AutomaticFunds funds;
 public HouseholdAutoService(JdbcTemplate jdbc,HouseholdBillingService billing,AutomaticFunds funds){this.jdbc=jdbc;this.billing=billing;this.funds=funds;}
 public void run(){
  var current=YearMonth.now(ZoneId.of("Europe/Berlin"));
  for(var account:jdbc.queryForList("select distinct account_id from recurring_templates where not deleted and status='ACTIVE' and automatic and frequency='MONTHLY' and scope='HOUSEHOLD' and type='EXPENSE' and currency='EUR'",UUID.class)){
   var first=jdbc.queryForObject("select min(first_date) from recurring_templates where not deleted and automatic and frequency='MONTHLY' and scope='HOUSEHOLD' and type='EXPENSE' and account_id=?",LocalDate.class,account);
   if(first==null)continue;var start=YearMonth.from(first);if(java.time.temporal.ChronoUnit.MONTHS.between(start,current)>600)throw new IllegalStateException("Household history exceeds supported range");
   for(var month=start;!month.isAfter(current);month=month.plusMonths(1))billing.autoMonthly(month.toString(),account,funds);
  }
 }
}
