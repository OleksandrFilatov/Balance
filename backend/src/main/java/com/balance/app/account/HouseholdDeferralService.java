package com.balance.app.account;

import com.balance.app.service.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Due-date metadata only. Call mutations while holding HouseholdBillingService.LOCK. */
@Service
public class HouseholdDeferralService {
  private static final BigDecimal ZERO=new BigDecimal("0.00");
  private final JdbcTemplate jdbc;
  private final Clock clock;
  public HouseholdDeferralService(JdbcTemplate jdbc,@Value("${balance.time-zone:Europe/Berlin}")String zone){this.jdbc=jdbc;clock=Clock.system(ZoneId.of(zone));}
  public record Change(@NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=17,fraction=2) BigDecimal amount,
      @NotNull @Digits(integer=17,fraction=2) BigDecimal expected,@NotNull @PositiveOrZero Long version){}
  public record Undo(@NotNull @PositiveOrZero Long version){}
  public record Schedule(String month,String targetMonth,BigDecimal remaining,BigDecimal deferred,BigDecimal payable,long version){}
  public record History(UUID id,String month,String targetMonth,BigDecimal amount,String action,java.time.Instant createdAt){}
  public record Allocation(UUID itemId,UUID templateId,String month,LocalDate originalDate,LocalDate dueDate,BigDecimal amount){}
  private record Plan(YearMonth target,BigDecimal amount,long version){}
  private Plan plan(YearMonth month){var rows=jdbc.query("select target_month,amount,version from household_bill_deferrals where month=?",(rs,n)->new Plan(YearMonth.from(rs.getObject(1,LocalDate.class)),rs.getBigDecimal(2),rs.getLong(3)),month.atDay(1));return rows.isEmpty()?null:rows.getFirst();}
  public boolean hasPlan(YearMonth month){var p=plan(month);return p!=null&&p.amount().signum()>0;}
  public Schedule schedule(String text,BigDecimal remaining,YearMonth asOf){
    var p=plan(YearMonth.parse(text));var deferred=p==null||remaining==null?ZERO:p.amount().min(remaining).max(ZERO);
    var future=p!=null&&p.target().isAfter(asOf);
    return new Schedule(text,p==null?null:p.target().toString(),remaining,deferred,
        remaining==null?null:remaining.subtract(future?deferred:ZERO),p==null?0:p.version());
  }
  public List<History> history(String month){return jdbc.query("select request_key,month,target_month,amount,action,created_at from household_bill_deferral_history where month=? order by created_at desc,request_key limit 100",(rs,n)->new History(rs.getObject(1,UUID.class),month,rs.getObject(3,LocalDate.class).toString().substring(0,7),rs.getBigDecimal(4),rs.getString(5),rs.getTimestamp(6).toInstant()),YearMonth.parse(month).atDay(1));}
  public Schedule defer(String month,BigDecimal remaining,Change request,UUID key){
    if(key==null)throw DomainException.invalid("Idempotency key required");
    var origin=YearMonth.parse(month);var now=YearMonth.now(clock);
    var base=origin.isAfter(now)?origin:now;
    if(base.getYear()>=9999&&base.getMonthValue()==12)throw DomainException.invalid("Для выбранного месяца следующий месяц недоступен.");
    var target=base.plusMonths(1);var amount=Money.amount(request.amount(),true);
    var fingerprint=hash(month+":"+amount+":"+request.expected().stripTrailingZeros()+":"+request.version());
    var prior=jdbc.queryForList("select fingerprint from household_bill_deferral_history where request_key=?",String.class,key);
    if(!prior.isEmpty()){if(!prior.getFirst().equals(fingerprint))throw DomainException.conflict("Ключ переноса уже использован.");return schedule(month,remaining,now);}
    var p=plan(origin);long version=p==null?0:p.version();
    if(request.version()!=version||remaining==null||remaining.compareTo(Money.amount(request.expected(),false))!=0)throw DomainException.conflict("Сумма или перенос изменились. Обновите страницу.");
    var existing=p!=null&&p.target().equals(target)?p.amount().min(remaining):ZERO;
    if(amount.compareTo(remaining.subtract(existing))>0)throw DomainException.invalid("Нельзя перенести больше неоплаченной суммы.");
    var total=existing.add(amount);
    jdbc.update("insert into household_bill_deferrals(month,target_month,amount,version) values(?,?,?,1) on conflict(month) do update set target_month=excluded.target_month,amount=excluded.amount,version=household_bill_deferrals.version+1,updated_at=now()",origin.atDay(1),target.atDay(1),total);
    jdbc.update("insert into household_bill_deferral_history(request_key,month,target_month,amount,fingerprint,action) values(?,?,?,?,?,'DEFER')",key,origin.atDay(1),target.atDay(1),total,fingerprint);
    return schedule(month,remaining,now);
  }
  public Schedule cancel(String month,BigDecimal remaining,Undo request){
    var origin=YearMonth.parse(month);var p=plan(origin);var now=YearMonth.now(clock);
    if(p==null||p.amount().signum()==0)return schedule(month,remaining,now);
    if(request.version()!=p.version())throw DomainException.conflict("Перенос изменился. Обновите страницу.");
    jdbc.update("update household_bill_deferrals set amount=0,version=version+1,updated_at=now() where month=?",origin.atDay(1));
    jdbc.update("insert into household_bill_deferral_history(request_key,month,target_month,amount,fingerprint,action) values(?,?,?,?,?,'CANCEL')",UUID.randomUUID(),origin.atDay(1),p.target().atDay(1),ZERO,hash("cancel:"+month+":"+p.version()));
    return schedule(month,remaining,now);
  }
  /** Assign the deferred tail of the outstanding month. Payments consume the oldest items first. */
  public List<Allocation> allocations(){
    var result=new ArrayList<Allocation>();
    for(var row:jdbc.queryForList("select month,target_month,amount from household_bill_deferrals where amount>0 order by month")){
      var origin=((java.sql.Date)row.get("month")).toLocalDate();var due=((java.sql.Date)row.get("target_month")).toLocalDate();var left=(BigDecimal)row.get("amount");
      var items=jdbc.query("select i.id,i.template_id,i.occurrence_date,i.mine, i.legacy_transaction_id, i.mine_payment_id, exists(select 1 from household_bill_payment_parts z where z.item_id=i.id) has_parts, coalesce((select sum(p.amount) from household_bill_payment_parts p join household_bill_payments x on x.id=p.payment_id where p.item_id=i.id and x.cancelled_at is null),0) paid from household_bill_items i where i.month=? and not i.voided order by i.occurrence_date desc,i.id desc",(rs,n)->{
        var mine=rs.getBigDecimal("mine");var remaining=mine==null?ZERO:mine;
        if(rs.getObject("legacy_transaction_id")!=null)remaining=ZERO;
        else if(rs.getBoolean("has_parts"))remaining=remaining.subtract(rs.getBigDecimal("paid")).max(ZERO);
        else if(rs.getObject("mine_payment_id")!=null)remaining=ZERO;
        return new Allocation(rs.getObject("id",UUID.class),rs.getObject("template_id",UUID.class),origin.toString().substring(0,7),rs.getObject("occurrence_date",LocalDate.class),due,remaining);
      },origin);
      for(var item:items){var amount=item.amount().min(left);if(amount.signum()>0)result.add(new Allocation(item.itemId(),item.templateId(),item.month(),item.originalDate(),due,amount));left=left.subtract(amount);if(left.signum()==0)break;}
    }
    return List.copyOf(result);
  }
  private String hash(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
