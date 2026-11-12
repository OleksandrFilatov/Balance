package com.balance.app.debt;

import com.balance.app.account.*;
import com.balance.app.service.*;
import com.balance.app.transaction.FinanceScope;
import jakarta.validation.constraints.*;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class DebtAutomationService {
 private static final BigDecimal ZERO=BigDecimal.ZERO.setScale(2);
 private final DebtService service;
 private final DebtRepository debts;
 private final DebtPaymentRepository payments;
 private final AccountRepository accounts;
 private final JdbcTemplate jdbc;
 private final AutomaticFunds funds;
 private final Clock clock;
 public DebtAutomationService(DebtService s,DebtRepository d,DebtPaymentRepository p,AccountRepository a,JdbcTemplate j,AutomaticFunds funds,@Value("${balance.time-zone:Europe/Berlin}")String zone){service=s;debts=d;payments=p;accounts=a;jdbc=j;this.funds=funds;clock=Clock.system(ZoneId.of(zone));}
 public record Settings(@NotNull Boolean enabled,UUID accountId,@NotNull @PositiveOrZero Long version){}
 public record MonthlyAuto(@NotNull @jakarta.validation.Valid DebtDto.Monthly debt,@NotNull UUID accountId){}
 public DebtDto.View createMonthly(MonthlyAuto body,UUID key){var d=service.createMonthly(body.debt(),key);configure(d.id(),new Settings(true,body.accountId(),0L));return service.get(d.id());}
 public record Segment(int number,LocalDate date,BigDecimal amount,BigDecimal paid,BigDecimal percent,String status,BigDecimal remaining){}
 public record Plan(UUID debtId,LocalDate openedOn,LocalDate firstDate,LocalDate endDate,BigDecimal monthlyAmount,long months,long completedMonths,int offset,List<Segment> segments,boolean automatic,UUID accountId,long version,String error,long debtVersion,boolean canEditSchedule,LocalDate nextPayment,BigDecimal nextAmount){}
 public record Schedule(@NotNull LocalDate firstDate,@NotNull @PositiveOrZero Long version){}
 public Plan reschedule(UUID id,Schedule body){
  var d=debts.lock(id).orElseThrow(()->DomainException.missing("Debt"));Money.version(d.version,body.version());var m=monthly(id);
  if(d.deleted||!"ACTIVE".equals(d.status)||m==null)throw DomainException.conflict("Нет активного помесячного графика.");
  if(jdbc.queryForObject("select count(*) from debt_payments where debt_id=?",Long.class,id)>0)throw DomainException.conflict("После первого погашения исходный график защищён от переноса, чтобы сохранить историю.");
  if(body.firstDate()==null||body.firstDate().isBefore(LocalDate.now(clock))||body.firstDate().getYear()>9999)throw DomainException.invalid("Выберите сегодняшнюю или будущую дату первого платежа.");
  long last=ChronoUnit.MONTHS.between(YearMonth.from(m.first()),YearMonth.from(m.end()));if(m.first().plusMonths(last).isAfter(m.end()))last--;
  LocalDate end;try{end=body.firstDate().plusMonths(last);if(end.getYear()>9999)throw new DateTimeException("Range");}catch(DateTimeException e){throw DomainException.invalid("График выходит за допустимые даты.");}
  jdbc.update("update debt_monthly_plans set first_date=?,end_date=? where debt_id=?",body.firstDate(),end,id);d.nextPayment=body.firstDate();d.monthlyPayment=m.amount();d.updatedAt=Instant.now();debts.flush();
  jdbc.update("update debt_automation set enabled=false,version=version+1,last_error=? where debt_id=? and enabled","График перенесён. Проверьте даты и включите автооплату заново.",id);
  return plan(id,null);
 }
 private record Monthly(LocalDate first,LocalDate end,BigDecimal amount){}
 private Monthly monthly(UUID id){var rows=jdbc.query("select first_date,end_date,monthly_amount from debt_monthly_plans where debt_id=?",(rs,n)->new Monthly(rs.getObject(1,LocalDate.class),rs.getObject(2,LocalDate.class),rs.getBigDecimal(3)),id);return rows.isEmpty()?null:rows.getFirst();}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Plan plan(UUID id,Integer selectedOffset){
  var d=service.get(id);var m=monthly(id);var settings=jdbc.queryForList("select enabled,account_id,version,last_error from debt_automation where debt_id=?",id);var row=settings.isEmpty()?null:settings.getFirst();
  long count=0,completed=0;var segments=new ArrayList<Segment>();int offset=0;
  if(m!=null){long last=ChronoUnit.MONTHS.between(YearMonth.from(m.first()),YearMonth.from(m.end()));if(m.first().plusMonths(last).isAfter(m.end()))last--;count=last+1;var paid=payments.paid(id);completed=paid.divideToIntegralValue(m.amount()).longValueExact();
   offset=selectedOffset==null?(int)Math.max(0,Math.min(count-24,completed-2)):selectedOffset;if(offset<0||offset>Math.max(0,count-1))throw DomainException.invalid("Invalid schedule offset");
   for(int i=offset;i<Math.min(count,offset+24L);i++){var allocated=paid.subtract(m.amount().multiply(BigDecimal.valueOf(i))).max(ZERO).min(m.amount());var percent=allocated.multiply(new BigDecimal("100")).divide(m.amount(),2,RoundingMode.HALF_UP);segments.add(new Segment(i+1,m.first().plusMonths(i),m.amount(),allocated,percent,allocated.compareTo(m.amount())==0?"PAID":allocated.signum()>0?"PARTIAL":"PLANNED",m.amount().subtract(allocated)));}
  }
  var paidAtDate=jdbc.queryForObject("select coalesce(sum(p.principal+p.interest),0) from debt_payments p where p.debt_id=? and p.scheduled_date=? and not exists(select 1 from debt_payment_reversals r where r.payment_id=p.id)",BigDecimal.class,id,d.terms().nextPayment());
  return new Plan(id,d.createdAt().atZone(clock.getZone()).toLocalDate(),m==null?null:m.first(),m==null?(d.terms().monthlyPayment()==null?d.terms().nextPayment():null):m.end(),m==null?d.terms().monthlyPayment():m.amount(),count,completed,offset,segments,row!=null&&Boolean.TRUE.equals(row.get("enabled")),row==null?null:(UUID)row.get("account_id"),row==null?0:((Number)row.get("version")).longValue(),row==null?null:(String)row.get("last_error"),d.version(),m!=null&&"ACTIVE".equals(d.status())&&jdbc.queryForObject("select count(*) from debt_payments where debt_id=?",Long.class,id)==0,d.terms().nextPayment(),DebtAmounts.due(d,paidAtDate));
 }
 public Plan configure(UUID id,Settings body){
  var d=debts.lock(id).orElseThrow(()->DomainException.missing("Debt"));if(d.deleted)throw DomainException.missing("Debt");
  var old=jdbc.queryForList("select enabled,account_id,version from debt_automation where debt_id=?",id);long version=old.isEmpty()?0:((Number)old.getFirst().get("version")).longValue();
  boolean wanted=Boolean.TRUE.equals(body.enabled());
  if(wanted&&d.nextPayment==null)throw DomainException.invalid("Укажите дату следующего платежа.");
  if(wanted){var m=monthly(id);if(!"ACTIVE".equals(d.status)||m==null||d.annualRate!=null&&d.annualRate.signum()!=0)throw DomainException.invalid("Автооплата доступна для активного помесячного долга без процентов.");if(d.monthlyPayment==null||d.monthlyPayment.compareTo(m.amount())!=0)throw DomainException.conflict("Сумма платежа отличается от помесячного плана. Проверьте условия долга.");if(body.accountId()==null)throw DomainException.invalid("Выберите счёт для автооплаты.");var a=accounts.lock(body.accountId()).orElseThrow(()->DomainException.missing("Account"));if(!a.isActive()||!"EUR".equals(a.getCurrency()))throw DomainException.invalid("Выберите активный счёт EUR.");}
  if(version!=body.version()){if(!old.isEmpty()&&Objects.equals(old.getFirst().get("enabled"),wanted)&&Objects.equals(old.getFirst().get("account_id"),body.accountId()))return plan(id,null);throw DomainException.conflict("Настройки уже изменились. Обновите страницу.");}
  jdbc.update("insert into debt_automation(debt_id,enabled,account_id,version) values(?,?,?,1) on conflict(debt_id) do update set enabled=excluded.enabled,account_id=excluded.account_id,version=debt_automation.version+1,last_error=null",id,wanted,body.accountId());return plan(id,null);
 }
 @Transactional(readOnly=true)
 public List<UUID> due(){return jdbc.queryForList("select d.id from debts d join debt_automation a on a.debt_id=d.id where a.enabled and not d.deleted and d.status='ACTIVE' and d.next_payment<=? order by d.next_payment,d.id limit 100",UUID.class,LocalDate.now(clock));}
 public boolean runDue(UUID id){return runDue(id,LocalDate.now(clock));}
 public boolean runDue(UUID id,LocalDate today){
  var d=debts.lock(id).orElseThrow(()->DomainException.missing("Debt"));var cfg=jdbc.queryForList("select enabled,account_id from debt_automation where debt_id=? for update",id);
  if(cfg.isEmpty()||!Boolean.TRUE.equals(cfg.getFirst().get("enabled"))||d.deleted||!"ACTIVE".equals(d.status)||d.nextPayment==null||d.nextPayment.isAfter(today))return false;
  var m=monthly(id);if(m==null||d.annualRate!=null&&d.annualRate.signum()!=0){failure(id,"Автооплата приостановлена: проверьте условия долга.");return false;}
  if(d.monthlyPayment==null||d.monthlyPayment.compareTo(m.amount())!=0){failure(id,"Сумма платежа отличается от помесячного плана. Проверьте условия долга.");return false;}
  var due=d.nextPayment;
  if(jdbc.queryForObject("select count(*) from debt_automatic_executions where debt_id=? and scheduled_date=?",Long.class,id,due)>0){jdbc.update("update debt_automation set enabled=false,version=version+1 where debt_id=?",id);failure(id,"Платёж за эту дату уже был проведён. Проверьте историю отмен и дату следующего платежа.");return false;}
  UUID accountId=(UUID)cfg.getFirst().get("account_id");var a=accounts.lock(accountId).orElseThrow(()->DomainException.missing("Account"));if(!a.isActive()||!"EUR".equals(a.getCurrency())){failure(id,"Счёт автооплаты недоступен.");return false;}
  var already=payments.paid(id);var remaining=d.openingRemaining.subtract(already);var principal=m.amount().subtract(already.remainder(m.amount())).min(remaining);if(principal.signum()<=0)return false;
  if(!m.first().plusMonths(already.divideToIntegralValue(m.amount()).longValueExact()).equals(due)){failure(id,"Следующая дата отличается от графика. Сначала согласуйте её кнопкой «Перенести график», чтобы не списать лишний взнос.");return false;}
  if(funds.free(accountId).compareTo(principal)<0){failure(id,"Недостаточно свободных денег для автооплаты: нужно "+principal+" €. Накопления не затрагиваются.");return false;}
  UUID key=UUID.nameUUIDFromBytes(("balance-debt-auto:"+id+":"+due).getBytes(StandardCharsets.UTF_8));
  var p=service.pay(id,new DebtDto.Pay(accountId,principal,ZERO,today,FinanceScope.PERSONAL,"Автоплатёж за "+due,null),key);
  jdbc.update("insert into debt_automatic_executions(debt_id,scheduled_date,payment_id) values(?,?,?)",id,due,p.id());jdbc.update("update debt_automation set last_error=null,last_attempt=now() where debt_id=?",id);return true;
 }
 public void failure(UUID id,String reason){jdbc.update("update debt_automation set last_error=?,last_attempt=now() where debt_id=?",reason.substring(0,Math.min(500,reason.length())),id);}
}
