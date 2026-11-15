package com.balance.app.account;

import com.balance.app.recurring.*;
import com.balance.app.transaction.TransactionType;
import com.balance.app.service.DomainException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** A single read-only income projection shared by the monthly balance and its breakdown. */
@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class IncomeForecastService {
 private static final BigDecimal ZERO=new BigDecimal("0.00");
 private final JdbcTemplate jdbc;private final RecurringService recurring;private final Recurrence recurrence;private final SalaryScheduleService salaries;private final Clock clock;
 public IncomeForecastService(JdbcTemplate jdbc,RecurringService recurring,Recurrence recurrence,SalaryScheduleService salaries,@Value("${balance.time-zone:Europe/Berlin}")String zone){this.jdbc=jdbc;this.recurring=recurring;this.recurrence=recurrence;this.salaries=salaries;clock=Clock.system(ZoneId.of(zone));}
 public record Line(String id,String name,LocalDate date,BigDecimal amount,String kind,String href,UUID categoryId){}
 public List<Line> lines(YearMonth month,String currency){
  var current=YearMonth.now(clock);if(month.isBefore(current))return List.of();
  var from=month.equals(current)?LocalDate.of(1,1,1):month.atDay(1);
  var expected=new ArrayList<>(jdbc.query("select id,description,operation_date,amount,category_id from financial_transactions where currency=? and type='INCOME' and status='PENDING' and not deleted and operation_date between ? and ? order by operation_date,id",(rs,n)->new Line(rs.getString("id"),rs.getString("description").isBlank()?"Ожидаемый доход":rs.getString("description"),rs.getObject("operation_date",LocalDate.class),rs.getBigDecimal("amount"),"INCOME","/money?month="+month,rs.getObject("category_id",UUID.class)),currency,from,month.atEndOfMonth()));
  for(var r:recurring.list())if(r.currency().equals(currency)&&r.status().equals("ACTIVE")&&r.template().type()==TransactionType.INCOME&&r.nextDate()!=null){
   var start=r.nextDate().isAfter(from)?r.nextDate():from;
   for(long index=recurrence.onOrAfter(r.template().firstDate(),r.template().frequency(),start);;index++){
    var date=recurrence.at(r.template().firstDate(),r.template().frequency(),index,r.template().endDate());if(date==null||date.isAfter(month.atEndOfMonth()))break;
    if(expected.size()>5000)throw DomainException.invalid("Too many income events; shorten the plan");
    expected.add(new Line("recurring/"+r.id()+"/"+date,r.template().name(),date,r.template().amount(),"INCOME","/recurring",r.template().categoryId()));
   }
  }
  if(currency.equals("EUR")){
   var covered=salaries.alreadyReceived(month,currency).add(expected.stream().filter(l->SalaryScheduleService.SALARY_CATEGORY.equals(l.categoryId())&&YearMonth.from(l.date()).equals(month)).map(Line::amount).reduce(ZERO,BigDecimal::add));
   for(var salary:salaries.receipts(month)){
    var rest=salary.amount().subtract(covered).max(ZERO);covered=covered.subtract(salary.amount()).max(ZERO);
    if(rest.signum()>0)expected.add(new Line("salary/"+salary.workMonth(),"Зарплата за "+salary.workMonth(),salary.date(),rest,"SALARY","/household?month="+salary.workMonth(),SalaryScheduleService.SALARY_CATEGORY));
   }
  }
  expected.sort(Comparator.comparing(Line::date).thenComparing(Line::id));return List.copyOf(expected);
 }
 public BigDecimal total(YearMonth month,String currency){return lines(month,currency).stream().map(Line::amount).reduce(ZERO,BigDecimal::add);}
}
