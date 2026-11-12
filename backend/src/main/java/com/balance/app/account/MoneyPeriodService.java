package com.balance.app.account;

import com.balance.app.debt.DebtService;
import com.balance.app.recurring.*;
import com.balance.app.service.*;
import com.balance.app.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Historical ledger totals and a separate, explicitly conditional cash projection. Never writes. */
@Service
@Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
public class MoneyPeriodService {
  private static final BigDecimal ZERO=new BigDecimal("0.00");
  private final PersonalMoneyService money;
  private final RecurringService recurring;
  private final Recurrence recurrence;
  private final DebtService debts;
  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final SalaryScheduleService salaries;
  public MoneyPeriodService(PersonalMoneyService money,RecurringService recurring,Recurrence recurrence,
      DebtService debts,JdbcTemplate jdbc,SalaryScheduleService salaries,@Value("${balance.time-zone:Europe/Berlin}") String zone){
    this.money=money;this.recurring=recurring;this.recurrence=recurrence;this.debts=debts;this.jdbc=jdbc;this.clock=Clock.system(ZoneId.of(zone));
    this.salaries=salaries;
  }
  public record Step(String month,BigDecimal opening,BigDecimal income,BigDecimal payments,
      BigDecimal closing,long unknownObligations){}
  public record Period(String month,String mode,boolean complete,PersonalMoneyDto.Overview overview,
      BigDecimal opening,BigDecimal paidMandatory,List<Step> steps,List<String> warnings){}

  public Period get(String text,String currency){
    Money.currency(currency);
    YearMonth selected;
    try{if(text==null||!text.matches("[0-9]{4}-(0[1-9]|1[0-2])"))throw new IllegalArgumentException();
      selected=YearMonth.parse(text);if(selected.getYear()<1)throw new IllegalArgumentException();
    }catch(Exception e){throw DomainException.invalid("Use month YYYY-MM");}
    var current=YearMonth.now(clock);var today=LocalDate.now(clock);
    if(selected.isAfter(current.plusMonths(24)))throw DomainException.invalid("Projection is limited to the next 24 months");
    if(selected.isBefore(current))return historical(selected,currency,today);
    var obligationCache=new HashMap<YearMonth,com.balance.app.calendar.CalendarDto.Obligations>();
    var now=money.overviewUntil(currency,current.atEndOfMonth(),obligationCache);
    if(selected.equals(current))return new Period(text,"CURRENT",now.unknownObligations()==0,now,null,ZERO,List.of(),List.of());

    var warnings=new ArrayList<String>();
    warnings.add("Прогноз: известные платежи предполагаются оплаченными в срок. Новые покупки и незаданные доходы не учтены. Резервы целей остаются частью банковского баланса.");
    warnings.add("Зарплата учитывается по дате получения: обычно за отработанный месяц — 15-го числа следующего. Дата меняется в коммуналке. Месяц работы определяет пропорции, дата получения — поступление денег. Совпадающие месячные планы доходов повторно не складываются.");
    long uncertainDebts=0;
    for(var d:debts.list())if(d.currency().equals(currency)&&"ACTIVE".equals(d.status())&&d.terms().nextPayment()!=null
        &&!d.terms().nextPayment().isAfter(selected.atEndOfMonth())){
      if(d.terms().annualRate()!=null&&d.terms().annualRate().signum()>0){
        uncertainDebts++;warnings.add("У долга «"+d.terms().name()+"» есть проценты: полного подтверждённого графика для этого прогноза нет.");
      }
      var plan=jdbc.queryForList("select first_date,monthly_amount from debt_monthly_plans where debt_id=?",d.id());
      if(!plan.isEmpty()){
        var first=((java.sql.Date)plan.getFirst().get("first_date")).toLocalDate();
        var amount=(BigDecimal)plan.getFirst().get("monthly_amount");
        long completed=d.recordedPrincipal().divideToIntegralValue(amount).longValueExact();
        if(!first.plusMonths(completed).equals(d.terms().nextPayment())){
          warnings.add("У долга «"+d.terms().name()+"» следующая дата отличается от исходного графика. Прогноз строится от следующей оплаты «"+d.terms().nextPayment()+"» и ограничен остатком долга; старые даты не создают дополнительный взнос. Исходный график можно проверить в карточке долга.");
        }
      }
    }
    var steps=new ArrayList<Step>();
    var opening=now.balance();var previousIncome=ZERO;var previousDue=now;
    BigDecimal previousMandatory=ZERO;
    boolean known=true;Step last=null;
    PersonalMoneyDto.Overview cumulative=now;
    for(var month=current;!month.isAfter(selected);month=month.plusMonths(1)){
      cumulative=month.equals(current)?now:money.overviewUntil(currency,month.atEndOfMonth(),obligationCache);
      var income=expectedIncome(currency,month.atEndOfMonth());
      var monthlyIncome=income.subtract(previousIncome);
      monthlyIncome=withMonthlySalary(month,currency,monthlyIncome);
      var monthlyDue=cumulative.mandatory().subtract(previousMandatory);
      long unknown=cumulative.unknownObligations()+uncertainDebts;
      boolean openingKnown=known;
      known=known&&unknown==0;
      var closing=known?opening.add(monthlyIncome).subtract(monthlyDue):null;
      last=new Step(month.toString(),openingKnown?opening:null,monthlyIncome,monthlyDue,closing,unknown);
      steps.add(last);
      if(!month.equals(selected))previousDue=cumulative;
      if(closing!=null)opening=closing;
      previousIncome=income;previousMandatory=cumulative.mandatory();
    }
    var lines=difference(cumulative.deductions(),previousDue.deductions(),selected.atEndOfMonth());
    var overview=new PersonalMoneyDto.Overview(currency,today,selected.atEndOfMonth(),
        last.opening()==null?ZERO:last.opening().add(last.income()),last.income(),last.payments(),
        last.payments(),last.closing(),known?0:Math.max(1,last.unknownObligations()),now.defaultAccountId(),lines);
    if(!known)warnings.add("Не все обязательства определены. Уточните зарплаты в коммуналке для каждого месяца и проверьте отмеченные графики долгов. До этого точный перенос остатка не показан.");
    return new Period(text,"FORECAST",known,overview,last.opening(),ZERO,List.copyOf(steps),List.copyOf(warnings));
  }

  private BigDecimal expectedIncome(String currency,LocalDate end){
    var total=jdbc.queryForObject("select coalesce(sum(amount),0) from financial_transactions where type='INCOME' and status='PENDING' and not deleted and currency=? and operation_date<=?",BigDecimal.class,currency,end);
    for(var r:recurring.list())if("ACTIVE".equals(r.status())&&r.nextDate()!=null&&!r.nextDate().isAfter(end)
        &&r.currency().equals(currency)&&r.template().type()==TransactionType.INCOME){
      long count=recurrence.count(r.template().firstDate(),r.template().frequency(),r.nextDate(),end,r.template().endDate());
      total=total.add(r.template().amount().multiply(BigDecimal.valueOf(count)));
    }
    return total;
  }

  private BigDecimal withMonthlySalary(YearMonth month,String currency,BigDecimal knownIncome){
    if(!"EUR".equals(currency))return knownIncome;
    return knownIncome.max(salaries.expected(month,currency));
  }

  private Period historical(YearMonth month,String currency,LocalDate today){
    var boundary=java.sql.Timestamp.from(month.plusMonths(1).atDay(1).atStartOfDay(clock.getZone()).toInstant());
    var balance=jdbc.queryForObject("select coalesce(sum(initial_balance),0) from accounts where currency=? and created_at<?",BigDecimal.class,currency,boundary);
    var movements=jdbc.queryForObject("select coalesce(sum(case when credit_account_id is not null then amount else 0 end-case when debit_account_id is not null then amount else 0 end),0) from financial_transactions where currency=? and status='CONFIRMED' and not deleted and operation_date<=?",BigDecimal.class,currency,month.atEndOfMonth());
    balance=balance.add(movements);
    var summary=jdbc.queryForMap("select coalesce(sum(case when type='INCOME' then amount else 0 end),0) income,coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) expense from financial_effects where currency=? and status='CONFIRMED' and not deleted and operation_date between ? and ?",currency,month.atDay(1),month.atEndOfMonth());
    var paid=jdbc.queryForObject("select coalesce(sum(case when debit_account_id is not null then amount else 0 end-case when credit_account_id is not null then amount else 0 end),0) from financial_transactions where currency=? and status='CONFIRMED' and not deleted and operation_date between ? and ? and (debt_id is not null and type<>'LOAN_RECEIPT' or household_payment_id is not null or type='EXPENSE' and (scope='HOUSEHOLD' or recurring_id is not null))",BigDecimal.class,currency,month.atDay(1),month.atEndOfMonth());
    var overview=new PersonalMoneyDto.Overview(currency,today,month.atEndOfMonth(),balance,(BigDecimal)summary.get("income"),(BigDecimal)summary.get("expense"),ZERO,balance,0,null,List.of());
    return new Period(month.toString(),"HISTORY",true,overview,null,paid,List.of(),List.of("Фактический остаток по сохранённой истории на конец месяца. Проведённые платежи уже учтены. Старый план неоплаченных обязательств задним числом не восстанавливается. Начальные остатки действуют с даты создания счетов; поздние исправления истории учитываются."));
  }

  private record LineKey(String type,String name,String href){}
  private List<PersonalMoneyDto.Deduction> difference(List<PersonalMoneyDto.Deduction> all,List<PersonalMoneyDto.Deduction> previous,LocalDate end){
    var before=new HashMap<LineKey,BigDecimal>();
    for(var d:previous)if(d.amount()!=null)before.merge(new LineKey(d.type(),d.name(),d.href()),d.amount(),BigDecimal::add);
    var totals=new LinkedHashMap<LineKey,BigDecimal>();
    for(var d:all)totals.merge(new LineKey(d.type(),d.name(),d.href()),d.amount()==null?ZERO:d.amount(),BigDecimal::add);
    var result=new ArrayList<PersonalMoneyDto.Deduction>();
    totals.forEach((key,amount)->{var delta=amount.subtract(before.getOrDefault(key,ZERO));if(delta.signum()>0)result.add(new PersonalMoneyDto.Deduction(key.type(),key.name(),end,delta,key.href()));});
    // Preserve unknown amounts for presentation; a missing share must not look like a zero bill.
    var unknown = new HashSet<LineKey>();
    for(var d:all)if(d.amount()==null&&unknown.add(new LineKey(d.type(),d.name(),d.href())))
      result.add(new PersonalMoneyDto.Deduction(d.type(),d.name(),end,null,d.href()));
    return List.copyOf(result);
  }
}
