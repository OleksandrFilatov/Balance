package com.balance.app.account;

import com.balance.app.recurring.*;
import com.balance.app.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class CashOutlookService {
 private static final BigDecimal ZERO=new BigDecimal("0.00");
 private final MoneyPeriodService periods;private final SalaryScheduleService salaries;
 private final RecurringService recurring;private final Recurrence recurrence;private final JdbcTemplate jdbc;private final Clock clock;
 public CashOutlookService(MoneyPeriodService periods,SalaryScheduleService salaries,RecurringService recurring,Recurrence recurrence,JdbcTemplate jdbc,@Value("${balance.time-zone:Europe/Berlin}")String zone){this.periods=periods;this.salaries=salaries;this.recurring=recurring;this.recurrence=recurrence;this.jdbc=jdbc;clock=Clock.system(ZoneId.of(zone));}
 public record Line(String id,String name,LocalDate date,BigDecimal amount,String kind,String href){}
 public record View(String month,String currency,BigDecimal actualIncome,BigDecimal actualExpense,BigDecimal actualOutflow,BigDecimal expectedIncome,BigDecimal plannedOutflow,boolean complete,long actualCount,List<Line> actual,List<Line> expected,List<Line> payments){}
 public View get(String text,String currency){
  var period=periods.get(text,currency);var month=YearMonth.parse(text);var current=YearMonth.now(clock);
  var totals=jdbc.queryForMap("select count(*) n,coalesce(sum(case when type='INCOME' then amount else 0 end),0) income,coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) expense,coalesce(sum(case when type in ('EXPENSE','DEBT_PRINCIPAL') then amount else 0 end),0) outflow from financial_effects where currency=? and status='CONFIRMED' and not deleted and type in ('INCOME','EXPENSE','DEBT_PRINCIPAL') and operation_date between ? and ?",currency,month.atDay(1),month.atEndOfMonth());
  var actual=jdbc.query("select t.id,t.type,t.operation_date,t.amount,t.debt_id,coalesce(nullif(btrim(t.description),''),c.name,'Операция') name from financial_effects t left join categories c on c.id=t.category_id where t.currency=? and t.status='CONFIRMED' and not t.deleted and t.type in ('INCOME','EXPENSE','DEBT_PRINCIPAL') and not exists(select 1 from financial_transactions correction where not correction.deleted and (correction.reversal_of=t.id or correction.id=t.id and correction.reversal_of is not null)) and t.operation_date between ? and ? order by t.operation_date desc,t.created_at desc,t.id desc limit 200",(rs,n)->new Line(rs.getString("id"),rs.getString("name"),rs.getObject("operation_date",LocalDate.class),rs.getBigDecimal("amount"),rs.getString("type"),rs.getObject("debt_id")==null?"/money?month="+text:"/debts/"+rs.getString("debt_id")),currency,month.atDay(1),month.atEndOfMonth());
  var expected=new ArrayList<Line>();
  if(!month.isBefore(current)){
   var from=month.equals(current)?LocalDate.of(1,1,1):month.atDay(1);
   expected.addAll(jdbc.query("select id,coalesce(description,'') description,operation_date,amount from financial_transactions where currency=? and type='INCOME' and status='PENDING' and not deleted and operation_date between ? and ? order by operation_date,id",(rs,n)->new Line(rs.getString("id"),rs.getString("description").isBlank()?"Ожидаемый доход":rs.getString("description"),rs.getObject("operation_date",LocalDate.class),rs.getBigDecimal("amount"),"INCOME","/money?month="+text),currency,from,month.atEndOfMonth()));
   for(var r:recurring.list())if(r.currency().equals(currency)&&r.status().equals("ACTIVE")&&r.template().type()==TransactionType.INCOME&&r.nextDate()!=null){
    var start=r.nextDate().isAfter(from)?r.nextDate():from;
    for(long index=recurrence.onOrAfter(r.template().firstDate(),r.template().frequency(),start);;index++){
     var date=recurrence.at(r.template().firstDate(),r.template().frequency(),index,r.template().endDate());if(date==null||date.isAfter(month.atEndOfMonth()))break;
     if(expected.size()>5000)throw com.balance.app.service.DomainException.invalid("Too many income events; shorten the plan");
     expected.add(new Line("recurring/"+r.id()+"/"+date,r.template().name(),date,r.template().amount(),"INCOME","/recurring"));
    }
   }
   var known=expected.stream().map(Line::amount).reduce(ZERO,BigDecimal::add);
   if(currency.equals("EUR")){
    var covered=salaries.alreadyReceived(month,currency).add(known);
    for(var salary:salaries.receipts(month)){
     var rest=salary.amount().subtract(covered).max(ZERO);covered=covered.subtract(salary.amount()).max(ZERO);
     if(rest.signum()>0)expected.add(new Line("salary/"+salary.workMonth(),"Зарплата за "+salary.workMonth(),salary.date(),rest,"SALARY","/household?month="+salary.workMonth()));
    }
   }
  }
  var payments=period.mode().equals("HISTORY")?List.<Line>of():period.overview().deductions().stream().map(d->new Line(d.type()+"/"+d.href()+"/"+d.name(),d.name(),period.mode().equals("FORECAST")?null:d.date(),d.amount(),d.type(),d.href())).toList();
  expected.sort(Comparator.comparing(Line::date).thenComparing(Line::id));
  return new View(text,currency,(BigDecimal)totals.get("income"),(BigDecimal)totals.get("expense"),(BigDecimal)totals.get("outflow"),expected.stream().map(Line::amount).reduce(ZERO,BigDecimal::add),period.mode().equals("HISTORY")?ZERO:period.overview().mandatory(),period.complete(),((Number)totals.get("n")).longValue(),actual,List.copyOf(expected),payments);
 }
}
