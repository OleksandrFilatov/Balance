package com.balance.app.account;

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
 private final MoneyPeriodService periods;private final IncomeForecastService incomes;private final JdbcTemplate jdbc;private final Clock clock;
 public CashOutlookService(MoneyPeriodService periods,IncomeForecastService incomes,JdbcTemplate jdbc,@Value("${balance.time-zone:Europe/Berlin}")String zone){this.periods=periods;this.incomes=incomes;this.jdbc=jdbc;clock=Clock.system(ZoneId.of(zone));}
 public record Line(String id,String name,LocalDate date,BigDecimal amount,String kind,String href,UUID categoryId){
  public Line(String id,String name,LocalDate date,BigDecimal amount,String kind,String href){this(id,name,date,amount,kind,href,null);}
 }
 public record View(String month,String currency,BigDecimal actualIncome,BigDecimal actualExpense,BigDecimal actualOutflow,BigDecimal expectedIncome,BigDecimal plannedOutflow,boolean complete,long actualCount,List<Line> actual,List<Line> expected,List<Line> payments){}
 public View get(String text,String currency){
  var period=periods.get(text,currency);var month=YearMonth.parse(text);var actualEnd=month.atEndOfMonth().isAfter(LocalDate.now(clock))?LocalDate.now(clock):month.atEndOfMonth();
  var totals=jdbc.queryForMap("select count(*) n,coalesce(sum(case when type='INCOME' then amount else 0 end),0) income,coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) expense,coalesce(sum(case when type in ('EXPENSE','DEBT_PRINCIPAL') then amount else 0 end),0) outflow from financial_effects t where currency=? and status='CONFIRMED' and not deleted and type in ('INCOME','EXPENSE','DEBT_PRINCIPAL') and not exists(select 1 from financial_transactions correction join financial_transactions original on original.id=correction.reversal_of where not correction.deleted and correction.status='CONFIRMED' and date_trunc('month',correction.operation_date)=date_trunc('month',original.operation_date) and (correction.reversal_of=t.id or correction.id=t.id) and correction.operation_date<=?) and operation_date between ? and ?",currency,actualEnd,month.atDay(1),actualEnd);
  var actual=jdbc.query("select t.id,t.type,t.operation_date,t.amount,t.debt_id,coalesce(nullif(btrim(t.description),''),c.name,'Операция') name from financial_effects t left join categories c on c.id=t.category_id where t.currency=? and t.status='CONFIRMED' and not t.deleted and t.type in ('INCOME','EXPENSE','DEBT_PRINCIPAL') and not exists(select 1 from financial_transactions correction join financial_transactions original on original.id=correction.reversal_of where not correction.deleted and correction.status='CONFIRMED' and date_trunc('month',correction.operation_date)=date_trunc('month',original.operation_date) and (correction.reversal_of=t.id or correction.id=t.id) and correction.operation_date<=?) and t.operation_date between ? and ? order by t.operation_date desc,t.created_at desc,t.id desc limit 200",(rs,n)->new Line(rs.getString("id"),rs.getString("name"),rs.getObject("operation_date",LocalDate.class),rs.getBigDecimal("amount"),rs.getString("type"),rs.getObject("debt_id")==null?"/money?month="+text:"/debts/"+rs.getString("debt_id")),currency,actualEnd,month.atDay(1),actualEnd);
  var expected=incomes.lines(month,currency).stream().map(l->new Line(l.id(),l.name(),l.date(),l.amount(),l.kind(),l.href(),l.categoryId())).toList();
  var payments=period.mode().equals("HISTORY")?List.<Line>of():period.overview().deductions().stream().map(d->new Line(d.type()+"/"+d.href()+"/"+d.name(),d.name(),period.mode().equals("FORECAST")?null:d.date(),d.amount(),d.type(),d.href())).toList();
  return new View(text,currency,(BigDecimal)totals.get("income"),(BigDecimal)totals.get("expense"),(BigDecimal)totals.get("outflow"),expected.stream().map(Line::amount).reduce(ZERO,BigDecimal::add),period.mode().equals("HISTORY")?ZERO:period.overview().mandatory(),period.complete(),((Number)totals.get("n")).longValue(),actual,List.copyOf(expected),payments);
 }
}
