package com.balance.app.account;

import com.balance.app.recurring.Recurrence;
import com.balance.app.service.DomainException;
import java.math.*;
import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
public class HouseholdPlanService {
  private final JdbcTemplate jdbc;
  private final Recurrence recurrence;
  private final HouseholdBillingService billing;
  public HouseholdPlanService(JdbcTemplate jdbc, Recurrence recurrence,HouseholdBillingService billing) { this.jdbc=jdbc; this.recurrence=recurrence; this.billing=billing; }
  public record Income(@NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal mine,
      @NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal ira, @NotNull @PositiveOrZero Long version,LocalDate myReceiptDate) {
    public Income(BigDecimal mine,BigDecimal ira,Long version){this(mine,ira,version,null);}
  }
  public record Line(UUID categoryId,String name,BigDecimal total,BigDecimal mine,BigDecimal ira,HouseholdSplit split) {}
  public record Group(BigDecimal total,BigDecimal mine,BigDecimal ira) {}
  public record Item(UUID templateId,UUID categoryId,String name,HouseholdSplit split,
      BigDecimal total,BigDecimal mine,BigDecimal ira,BigDecimal paymentAmount,BigDecimal paymentMine,BigDecimal paymentIra) {}
  public record Plan(String month,BigDecimal myIncome,BigDecimal iraIncome,long version,boolean configured,
      BigDecimal difference,BigDecimal total,BigDecimal mine,BigDecimal ira,List<Line> lines,
      Group fixed,Group additional,BigDecimal minePercent,BigDecimal iraPercent,List<Item> items,LocalDate myReceiptDate) {}
  private record Payment(UUID id,UUID category,String categoryName,String name,BigDecimal amount,
      HouseholdSplit split,LocalDate first,Recurrence.Frequency frequency,String status,LocalDate end) {}
  private record Charge(Payment payment,LocalDate date,BigDecimal amount) {}
  private record Category(UUID id,HouseholdSplit split) {}
  private static final BigDecimal ZERO=BigDecimal.ZERO.setScale(2);

  private YearMonth month(String text) {
    try { if(text==null||!text.matches("[0-9]{4}-(0[1-9]|1[0-2])"))throw new IllegalArgumentException();
      var m=YearMonth.parse(text);if(m.getYear()<1)throw new IllegalArgumentException();return m;
    } catch(Exception e){throw DomainException.invalid("Use month YYYY-MM");}
  }
  @Transactional(isolation=Isolation.READ_COMMITTED)
  public Plan save(String text,Income income) {
    var m=month(text);
    jdbc.queryForList("select pg_advisory_xact_lock(729145064)");
    var rows=jdbc.queryForList("select version,mine,ira from household_monthly_income where month=?",m.atDay(1));
    long current=rows.isEmpty()?0:((Number)rows.getFirst().get("version")).longValue();
    if(current!=income.version())throw DomainException.conflict("Данные уже изменились. Обновите страницу.");
    boolean amountsChanged=rows.isEmpty()||((BigDecimal)rows.getFirst().get("mine")).compareTo(income.mine())!=0||((BigDecimal)rows.getFirst().get("ira")).compareTo(income.ira())!=0;
    if(amountsChanged)billing.preservePast();
    if(income.myReceiptDate()!=null&&(income.myReceiptDate().isBefore(m.atDay(1))||income.myReceiptDate().getYear()>9999))throw DomainException.invalid("Дата получения зарплаты не может быть раньше месяца работы.");
    jdbc.update("insert into household_monthly_income(month,mine,ira,version,mine_receipt_date) values(?,?,?,1,?) on conflict(month) do update set mine=excluded.mine,ira=excluded.ira,mine_receipt_date=coalesce(excluded.mine_receipt_date,household_monthly_income.mine_receipt_date),version=household_monthly_income.version+1",m.atDay(1),income.mine(),income.ira(),income.myReceiptDate());
    if(amountsChanged)billing.incomeChanged(text);
    return get(text);
  }
  public static BigDecimal share(BigDecimal total,BigDecimal mine,BigDecimal ira) {
    if(mine.signum()<0||ira.signum()<0)throw DomainException.invalid("Negative income");
    return mine.add(ira).signum()==0?null:total.multiply(mine).divide(mine.add(ira),2,RoundingMode.HALF_UP);
  }
  private static Group group(BigDecimal total,BigDecimal mine) { return new Group(total,mine,mine==null?null:total.subtract(mine)); }

  public Plan get(String text) {
    var m=month(text);
    var incomes=jdbc.queryForList("select mine,ira,version,mine_receipt_date from household_monthly_income where month=?",m.atDay(1));
    BigDecimal mine=incomes.isEmpty()?ZERO:(BigDecimal)incomes.getFirst().get("mine");
    BigDecimal ira=incomes.isEmpty()?ZERO:(BigDecimal)incomes.getFirst().get("ira");
    long version=incomes.isEmpty()?0:((Number)incomes.getFirst().get("version")).longValue();
    boolean configured=mine.add(ira).signum()>0;
    var payments=new LinkedHashMap<UUID,Payment>();
    jdbc.query("select r.id,r.category_id,c.name category_name,r.name,r.amount,r.household_split,r.first_date,r.frequency,r.status,r.end_date from recurring_templates r join categories c on c.id=r.category_id where not r.deleted and r.type='EXPENSE' and r.scope='HOUSEHOLD' and r.currency='EUR' order by r.created_at,r.id",rs->{
      var p=new Payment(rs.getObject("id",UUID.class),rs.getObject("category_id",UUID.class),rs.getString("category_name"),rs.getString("name"),rs.getBigDecimal("amount"),HouseholdSplit.valueOf(rs.getString("household_split")),rs.getObject("first_date",LocalDate.class),Recurrence.Frequency.valueOf(rs.getString("frequency")),rs.getString("status"),rs.getObject("end_date",LocalDate.class));
      payments.put(p.id(),p);
    });
    var charges=new ArrayList<Charge>();
    // Keep agreed costs of completed occurrences. Never rewrite their transactions.
    jdbc.query("select e.template_id,e.occurrence_date,t.amount from recurring_executions e join financial_transactions t on t.id=e.transaction_id where e.occurrence_date between ? and ? and not t.deleted and t.status='CONFIRMED'",rs->{
      var p=payments.get(rs.getObject("template_id",UUID.class));
      if(p!=null)charges.add(new Charge(p,rs.getObject("occurrence_date",LocalDate.class),rs.getBigDecimal("amount")));
    },m.atDay(1),m.atEndOfMonth());
    var decided=new HashSet<String>();
    jdbc.query("select template_id,occurrence_date from recurring_executions where occurrence_date between ? and ? union select template_id,occurrence_date from recurring_cancellations where occurrence_date between ? and ?",rs->{decided.add(rs.getObject(1)+":"+rs.getObject(2));},m.atDay(1),m.atEndOfMonth(),m.atDay(1),m.atEndOfMonth());
    for(var p:payments.values())if(p.status().equals("ACTIVE")) {
      for(long index=recurrence.onOrAfter(p.first(),p.frequency(),m.atDay(1));;index++) {
        var date=recurrence.at(p.first(),p.frequency(),index,p.end());
        if(date==null||date.isAfter(m.atEndOfMonth()))break;
        if(!decided.contains(p.id()+":"+date))charges.add(new Charge(p,date,p.amount()));
      }
    }
    if(m.isBefore(YearMonth.now(ZoneId.of("Europe/Berlin"))) && jdbc.queryForObject("select count(*) from household_bill_months where month=?",Long.class,m.atDay(1))>0){
      charges.clear();
      for(var saved:billing.stored(m.atDay(1),m.atEndOfMonth())){
        var p=payments.get(saved.templateId());
        if(p==null){var name=jdbc.queryForObject("select name from categories where id=?",String.class,saved.categoryId());p=new Payment(saved.templateId(),saved.categoryId(),name,saved.name(),saved.amount(),saved.split(),saved.date(),Recurrence.Frequency.MONTHLY,"ARCHIVED",null);payments.put(p.id(),p);}
        charges.add(new Charge(p,saved.date(),saved.amount()));
      }
    }
    charges.sort(Comparator.comparing(Charge::date).thenComparing(c->c.payment().id()));
    var totals=new LinkedHashMap<Category,BigDecimal>();var own=new HashMap<Category,BigDecimal>();
    var itemTotals=new HashMap<UUID,BigDecimal>();var itemOwn=new HashMap<UUID,BigDecimal>();
    for(var charge:charges) {
      var p=charge.payment();var key=new Category(p.category(),p.split());
      var before=totals.getOrDefault(key,ZERO);var after=before.add(charge.amount());
      totals.put(key,after);itemTotals.merge(p.id(),charge.amount(),BigDecimal::add);
      BigDecimal my=p.split()==HouseholdSplit.EQUAL?HouseholdSplit.half(charge.amount()):
          configured?share(after,mine,ira).subtract(share(before,mine,ira)):null;
      if(my!=null){own.merge(key,my,BigDecimal::add);itemOwn.merge(p.id(),my,BigDecimal::add);}
    }
    var lines=new ArrayList<Line>();BigDecimal fixedTotal=ZERO,fixedOwn=ZERO,extraTotal=ZERO,extraOwn=ZERO;
    for(var entry:totals.entrySet()) {
      var key=entry.getKey();var total=entry.getValue();
      var my=key.split()==HouseholdSplit.PROPORTIONAL&&!configured?null:own.getOrDefault(key,ZERO);
      var name=payments.values().stream().filter(p->p.category().equals(key.id())).findFirst().orElseThrow().categoryName();
      lines.add(new Line(key.id(),name,total,my,my==null?null:total.subtract(my),key.split()));
      if(key.split()==HouseholdSplit.PROPORTIONAL){fixedTotal=fixedTotal.add(total);if(my!=null)fixedOwn=fixedOwn.add(my);}
      else{extraTotal=extraTotal.add(total);extraOwn=extraOwn.add(my);}
    }
    lines.sort(Comparator.comparing(Line::name).thenComparing(l->l.split().name()));
    var items=new ArrayList<Item>();
    for(var p:payments.values()) {
      var total=itemTotals.getOrDefault(p.id(),ZERO);
      if(p.status().equals("ARCHIVED")&&total.signum()==0)continue;
      var my=p.split()==HouseholdSplit.PROPORTIONAL&&!configured&&total.signum()>0?null:itemOwn.getOrDefault(p.id(),ZERO);
      var paymentMy=p.split()==HouseholdSplit.EQUAL?HouseholdSplit.half(p.amount()):share(p.amount(),mine,ira);
      items.add(new Item(p.id(),p.category(),p.name(),p.split(),total,my,my==null?null:total.subtract(my),p.amount(),paymentMy,paymentMy==null?null:p.amount().subtract(paymentMy)));
    }
    var fixed=group(fixedTotal,!configured&&fixedTotal.signum()>0?null:fixedOwn);
    var extra=group(extraTotal,extraOwn);var total=fixedTotal.add(extraTotal);
    var my=fixed.mine()==null?null:fixed.mine().add(extra.mine());
    var percent=share(new BigDecimal("100"),mine,ira);
    var receipt=incomes.isEmpty()||incomes.getFirst().get("mine_receipt_date")==null?SalaryScheduleService.defaultDate(m):((java.sql.Date)incomes.getFirst().get("mine_receipt_date")).toLocalDate();
    return new Plan(text,mine,ira,version,configured,mine.subtract(ira),total,my,my==null?null:total.subtract(my),lines,fixed,extra,percent,percent==null?null:new BigDecimal("100").subtract(percent),items,receipt);
  }
}
