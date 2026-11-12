package com.balance.app.recurring;

import com.balance.app.account.HouseholdBillingService;
import com.balance.app.service.DomainException;
import com.balance.app.transaction.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Read-only completion of scheduled monthly obligations, never an elapsed-time indicator. */
@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class RecurringProgressService {
 private static final BigDecimal ZERO=new BigDecimal("0.00");
 private final RecurringService recurring;private final Recurrence recurrence;private final HouseholdBillingService billing;private final JdbcTemplate jdbc;
 public RecurringProgressService(RecurringService recurring,Recurrence recurrence,HouseholdBillingService billing,JdbcTemplate jdbc){this.recurring=recurring;this.recurrence=recurrence;this.billing=billing;this.jdbc=jdbc;}
 public record Progress(UUID id,String month,BigDecimal planned,BigDecimal paid,BigDecimal remaining,BigDecimal percent,int completed,int occurrences,String currency,boolean complete,boolean personalShare){}
 public List<Progress> get(String text){
  YearMonth month;try{if(text==null||!text.matches("[0-9]{4}-(0[1-9]|1[0-2])"))throw new IllegalArgumentException();month=YearMonth.parse(text);if(month.getYear()<1)throw new IllegalArgumentException();}catch(Exception e){throw DomainException.invalid("Use month YYYY-MM");}
  var household=billing.items(text);var result=new ArrayList<Progress>();
  for(var rule:recurring.list()){
   BigDecimal planned=ZERO,paid=ZERO;int completed=0,occurrences=0;boolean complete=true;
   boolean own=rule.template().scope()==FinanceScope.HOUSEHOLD&&rule.template().type()==TransactionType.EXPENSE&&rule.currency().equals("EUR");
   if(own){
    for(var item:household)if(item.templateId().equals(rule.id())){occurrences++;if(item.mine()==null||item.mineRemaining()==null){complete=false;continue;}planned=planned.add(item.mine());paid=paid.add(item.mine().subtract(item.mineRemaining()));if(item.minePaid())completed++;}
   }else{
    var decided=new HashSet<LocalDate>();
    for(var row:jdbc.queryForList("select e.occurrence_date,t.amount,t.deleted,t.status from recurring_executions e join financial_transactions t on t.id=e.transaction_id where e.template_id=? and e.occurrence_date between ? and ?",rule.id(),month.atDay(1),month.atEndOfMonth())){
     var date=((java.sql.Date)row.get("occurrence_date")).toLocalDate();decided.add(date);
     if(!Boolean.TRUE.equals(row.get("deleted"))&&"CONFIRMED".equals(row.get("status"))){var amount=(BigDecimal)row.get("amount");planned=planned.add(amount);paid=paid.add(amount);completed++;occurrences++;}
    }
    jdbc.query("select occurrence_date from recurring_cancellations where template_id=? and occurrence_date between ? and ?",rs->{decided.add(rs.getObject(1,LocalDate.class));},rule.id(),month.atDay(1),month.atEndOfMonth());
    if(rule.status().equals("ACTIVE")&&rule.nextDate()!=null){
     var from=rule.nextDate().isAfter(month.atDay(1))?rule.nextDate():month.atDay(1);
     for(long i=recurrence.onOrAfter(rule.template().firstDate(),rule.template().frequency(),from);;i++){
      var date=recurrence.at(rule.template().firstDate(),rule.template().frequency(),i,rule.template().endDate());if(date==null||date.isAfter(month.atEndOfMonth()))break;
      if(!decided.contains(date)){planned=planned.add(rule.template().amount());occurrences++;}
     }
    }
   }
   var percent=!complete||planned.signum()==0?null:paid.multiply(new BigDecimal("100")).divide(planned,2,RoundingMode.HALF_UP).min(new BigDecimal("100.00"));
   result.add(new Progress(rule.id(),text,complete?planned:null,paid,complete?planned.subtract(paid).max(ZERO):null,percent,completed,occurrences,rule.currency(),complete,own));
  }
  return List.copyOf(result);
 }
}
