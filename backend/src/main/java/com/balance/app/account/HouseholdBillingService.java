package com.balance.app.account;

import com.balance.app.recurring.Recurrence;
import com.balance.app.service.*;
import com.balance.app.transaction.*;
import jakarta.validation.constraints.*;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Monthly household obligations are plans; only an explicit owner's settlement posts money. */
@Service
@Transactional(readOnly=true)
public class HouseholdBillingService {
 public static final long LOCK=729145064L;
 private static final BigDecimal ZERO=BigDecimal.ZERO.setScale(2);
 private final JdbcTemplate jdbc;
 private final Recurrence recurrence;
 private final TransactionService transactions;
 private final TransactionRepository ledger;
 private final AccountRepository accounts;
 private final Clock clock;
 private final HouseholdDeferralService deferrals;
 public HouseholdBillingService(JdbcTemplate j,Recurrence r,TransactionService t,TransactionRepository l,AccountRepository a,HouseholdDeferralService deferrals,@Value("${balance.time-zone:Europe/Berlin}")String zone){jdbc=j;recurrence=r;transactions=t;ledger=l;accounts=a;this.deferrals=deferrals;clock=Clock.system(ZoneId.of(zone));}
 public enum Person {MINE,IRA}
 public record Pay(@NotNull Person person,UUID accountId,@NotNull LocalDate operationDate,@NotNull @DecimalMin("0") BigDecimal expected,@Digits(integer=17,fraction=2) @DecimalMin(value="0",inclusive=false) BigDecimal amount){
  public Pay(Person person,UUID accountId,LocalDate operationDate,BigDecimal expected){this(person,accountId,operationDate,expected,null);}
 }
 public record Cancel(@NotBlank @Size(max=500) String reason){}
 public record Amounts(BigDecimal mine,BigDecimal ira){}
 public record Item(UUID id,String month,UUID templateId,LocalDate date,UUID categoryId,String name,HouseholdSplit split,BigDecimal amount,BigDecimal mine,BigDecimal ira,boolean minePaid,boolean iraPaid,UUID legacyTransactionId,BigDecimal mineRemaining){
  public Item(UUID id,String month,UUID templateId,LocalDate date,UUID categoryId,String name,HouseholdSplit split,BigDecimal amount,BigDecimal mine,BigDecimal ira,boolean minePaid,boolean iraPaid,UUID legacyTransactionId){this(id,month,templateId,date,categoryId,name,split,amount,mine,ira,minePaid,iraPaid,legacyTransactionId,minePaid?ZERO:mine);}
 }
 public record Payment(UUID id,String month,Person person,BigDecimal amount,LocalDate operationDate,boolean cancelled){}
 public record Month(String month,Amounts planned,Amounts remaining,List<Item> items){}
 public record Statement(String month,Month current,List<Month> arrears,Amounts previous,Amounts total,List<Payment> payments,Amounts contribution,List<HouseholdDeferralService.Schedule> schedules,List<HouseholdDeferralService.History> deferralHistory){}
 private record Rule(UUID id,UUID category,String name,HouseholdSplit split,BigDecimal amount,LocalDate first,Recurrence.Frequency frequency,LocalDate next,String status,boolean deleted,LocalDate end){}
 private YearMonth parse(String text){try{if(text==null||!text.matches("[0-9]{4}-(0[1-9]|1[0-2])"))throw new IllegalArgumentException();var m=YearMonth.parse(text);if(m.getYear()<1)throw new IllegalArgumentException();return m;}catch(Exception e){throw DomainException.invalid("Use month YYYY-MM");}}
 private YearMonth now(){return YearMonth.now(clock);}
 public void lock(){jdbc.queryForList("select pg_advisory_xact_lock(?)",LOCK);}
 public boolean isDeferred(LocalDate date){return date!=null&&deferrals.hasPlan(YearMonth.from(date));}
 private List<Rule> rules(){return jdbc.query("select id,category_id,name,household_split,amount,first_date,frequency,next_date,status,deleted,end_date from recurring_templates where type='EXPENSE' and scope='HOUSEHOLD' and currency='EUR' order by id",(rs,n)->new Rule(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getString(3),HouseholdSplit.valueOf(rs.getString(4)),rs.getBigDecimal(5),rs.getObject(6,LocalDate.class),Recurrence.Frequency.valueOf(rs.getString(7)),rs.getObject(8,LocalDate.class),rs.getString(9),rs.getBoolean(10),rs.getObject(11,LocalDate.class)));}
 public List<Item> stored(LocalDate from,LocalDate to){var result=jdbc.query("select i.*,coalesce(i.legacy_transaction_id,e.transaction_id) effective_legacy_id,coalesce(not t.deleted AND t.status='CONFIRMED',false) legacy_paid from household_bill_items i left join recurring_executions e on e.template_id=i.template_id and e.occurrence_date=i.occurrence_date left join financial_transactions t on t.id=coalesce(i.legacy_transaction_id,e.transaction_id) where not i.voided and i.occurrence_date between ? and ? order by occurrence_date,id",(rs,n)->new Item(rs.getObject("id",UUID.class),rs.getObject("month",LocalDate.class).toString().substring(0,7),rs.getObject("template_id",UUID.class),rs.getObject("occurrence_date",LocalDate.class),rs.getObject("category_id",UUID.class),rs.getString("name"),HouseholdSplit.valueOf(rs.getString("split")),rs.getBigDecimal("amount"),rs.getBigDecimal("mine"),rs.getBigDecimal("ira"),rs.getBoolean("legacy_paid")||rs.getObject("mine_payment_id")!=null,rs.getBoolean("legacy_paid")||rs.getObject("ira_payment_id")!=null,rs.getObject("effective_legacy_id",UUID.class)),from,to);
  var paid=new HashMap<UUID,BigDecimal>();
  jdbc.query("select p.item_id,coalesce(sum(p.amount) filter(where x.cancelled_at is null),0) paid from household_bill_payment_parts p join household_bill_payments x on x.id=p.payment_id join household_bill_items i on i.id=p.item_id where i.occurrence_date between ? and ? group by p.item_id",rs->{paid.put(rs.getObject(1,UUID.class),rs.getBigDecimal(2));},from,to);
  return result.stream().map(i->{if(!paid.containsKey(i.id())||i.legacyTransactionId()!=null&&i.minePaid())return i;var remaining=i.mine()==null?null:i.mine().subtract(paid.get(i.id())).max(ZERO);return new Item(i.id(),i.month(),i.templateId(),i.date(),i.categoryId(),i.name(),i.split(),i.amount(),i.mine(),i.ira(),remaining!=null&&remaining.signum()==0,i.iraPaid(),i.legacyTransactionId(),remaining);}).toList();
 }
 private boolean prepared(YearMonth m){return jdbc.queryForObject("select count(*) from household_bill_months where month=?",Long.class,m.atDay(1))>0;}
 public List<Item> items(String text){return items(parse(text));}
 private List<Item> items(YearMonth m){
  var saved=stored(m.atDay(1),m.atEndOfMonth());
  if(m.isBefore(now())&&prepared(m))return saved;
  var frozen=deferrals.hasPlan(m);var keep=new HashMap<UUID,Item>();saved.stream().filter(i->i.minePaid()||i.iraPaid()||partlyPaid(i)||frozen).forEach(i->keep.put(i.id(),i));
  var incomes=jdbc.queryForList("select mine,ira from household_monthly_income where month=?",m.atDay(1));
  var mine=incomes.isEmpty()?ZERO:(BigDecimal)incomes.getFirst().get("mine");var ira=incomes.isEmpty()?ZERO:(BigDecimal)incomes.getFirst().get("ira");
  var executions=new HashMap<String,Map<String,Object>>();
  for(var row:jdbc.queryForList("select e.template_id,e.occurrence_date,t.id,t.amount,t.deleted,t.status from recurring_executions e join financial_transactions t on t.id=e.transaction_id where e.occurrence_date between ? and ?",m.atDay(1),m.atEndOfMonth()))executions.put(row.get("template_id")+":"+row.get("occurrence_date"),row);
  var cancelled=new HashSet<String>();for(var row:jdbc.queryForList("select template_id,occurrence_date from recurring_cancellations where occurrence_date between ? and ?",m.atDay(1),m.atEndOfMonth()))cancelled.add(row.get("template_id")+":"+row.get("occurrence_date"));
  var result=new ArrayList<Item>();
  for(var r:rules()){
   if(r.deleted())continue;
   for(long index=recurrence.onOrAfter(r.first(),r.frequency(),m.atDay(1));;index++){
    var date=recurrence.at(r.first(),r.frequency(),index,r.end());if(date==null||date.isAfter(m.atEndOfMonth()))break;
    var key=r.id()+":"+date;var id=UUID.nameUUIDFromBytes(("household-bill:"+key).getBytes(StandardCharsets.UTF_8));
    if(keep.containsKey(id)){result.add(keep.remove(id));continue;}
    var old=executions.get(key);if(cancelled.contains(key)||(old!=null&&(Boolean.TRUE.equals(old.get("deleted"))||!"CONFIRMED".equals(old.get("status")))))continue;
    if(old==null&&(!r.status().equals("ACTIVE")||r.next()==null||date.isBefore(r.next())))continue;
    var amount=old==null?r.amount():(BigDecimal)old.get("amount");
    var my=r.split()==HouseholdSplit.EQUAL?HouseholdSplit.half(amount):HouseholdPlanService.share(amount,mine,ira);
    result.add(new Item(id,m.toString(),r.id(),date,r.category(),r.name(),r.split(),amount,my,my==null?null:amount.subtract(my),old!=null,old!=null,old==null?null:(UUID)old.get("id")));
   }
  }
  result.addAll(keep.values());result.sort(Comparator.comparing(Item::date).thenComparing(Item::id));
  // Round cumulatively within each fixed category so every daily amount adds up to its monthly share.
  var sums=new HashMap<UUID,BigDecimal>();var out=new ArrayList<Item>();
  for(var i:result){if(i.split()!=HouseholdSplit.PROPORTIONAL){out.add(i);continue;}if(i.minePaid()||i.iraPaid()||partlyPaid(i)||frozen){out.add(i);sums.merge(i.categoryId(),i.amount(),BigDecimal::add);continue;}
   var before=sums.getOrDefault(i.categoryId(),ZERO);var after=before.add(i.amount());sums.put(i.categoryId(),after);
   var my=HouseholdPlanService.share(after,mine,ira);if(my!=null)my=my.subtract(HouseholdPlanService.share(before,mine,ira));
   out.add(new Item(i.id(),i.month(),i.templateId(),i.date(),i.categoryId(),i.name(),i.split(),i.amount(),my,my==null?null:i.amount().subtract(my),false,false,null));}
  return out;
 }
 private BigDecimal sum(List<Item> items,Person p,boolean remaining){BigDecimal total=ZERO;for(var i:items){if(remaining&&(p==Person.MINE?i.minePaid():i.iraPaid()))continue;var value=p==Person.MINE?(remaining?i.mineRemaining():i.mine()):i.ira();if(value==null)return null;total=total.add(value);}return total;}
 private boolean partlyPaid(Item i){return i.mine()!=null&&i.mineRemaining()!=null&&i.mineRemaining().compareTo(i.mine())<0;}
 private Amounts amounts(List<Item> items,boolean remaining){return new Amounts(sum(items,Person.MINE,remaining),sum(items,Person.IRA,remaining));}
 private Month view(YearMonth m){var rows=items(m);return new Month(m.toString(),amounts(rows,false),amounts(rows,true),rows);}
 private YearMonth first(YearMonth through){var date=jdbc.queryForObject("select min(d) from (select first_date d from recurring_templates where type='EXPENSE' and scope='HOUSEHOLD' and currency='EUR' and not deleted union all select month from household_bill_months) s",LocalDate.class);var first=date==null?through:YearMonth.from(date);if(first.isAfter(through))return through;if(java.time.temporal.ChronoUnit.MONTHS.between(first,through)>600)throw DomainException.invalid("Household history exceeds 50 years; select a supported start date");return first;}
 private BigDecimal add(BigDecimal a,BigDecimal b){return a==null||b==null?null:a.add(b);}
 public Statement statement(String text){var m=parse(text);var current=view(m);var older=new ArrayList<Month>();BigDecimal my=ZERO,ira=ZERO;for(var x=first(m);x.isBefore(m);x=x.plusMonths(1)){var row=view(x);if(row.remaining().mine()==null||row.remaining().ira()==null||row.remaining().mine().signum()!=0||row.remaining().ira().signum()!=0){older.add(row);my=add(my,row.remaining().mine());ira=add(ira,row.remaining().ira());}}
  var payments=jdbc.query("select id,month,person,amount,operation_date,cancelled_at from household_bill_payments where month<=? order by created_at desc limit 100",(rs,n)->new Payment(rs.getObject(1,UUID.class),rs.getObject(2,LocalDate.class).toString().substring(0,7),Person.valueOf(rs.getString(3)),rs.getBigDecimal(4),rs.getObject(5,LocalDate.class),rs.getObject(6)!=null),m.atDay(1));
  var schedules=new ArrayList<HouseholdDeferralService.Schedule>();for(var row:older)schedules.add(deferrals.schedule(row.month(),row.remaining().mine(),now()));schedules.add(deferrals.schedule(text,current.remaining().mine(),now()));return new Statement(text,current,older,new Amounts(my,ira),new Amounts(add(my,current.remaining().mine()),add(ira,current.remaining().ira())),payments,new Amounts(add(my,current.remaining().mine()),current.planned().ira()),List.copyOf(schedules),deferrals.history(text));}
 @Transactional public Statement prepare(String text){lock();var through=parse(text);if(through.isAfter(now()))through=now();for(var m=first(through);!m.isAfter(through);m=m.plusMonths(1))persist(m);return statement(text);}
 @Transactional public void preservePast(){lock();var previous=now().minusMonths(1);for(var m=first(previous);!m.isAfter(previous);m=m.plusMonths(1))persist(m);}
 @Transactional public void refreshCurrent(){lock();persist(now());}
 @Transactional public void voidOccurrence(UUID template,LocalDate date){lock();jdbc.update("update household_bill_items set voided=true where template_id=? and occurrence_date=? and mine_payment_id is null and ira_payment_id is null",template,date);}
 private void persist(YearMonth m){if(m.isBefore(now())&&prepared(m))return;var rows=items(m);if(rows.isEmpty()&&!prepared(m))return;jdbc.update("insert into household_bill_months(month) values(?) on conflict do nothing",m.atDay(1));
  jdbc.update("update household_bill_items set voided=true where month=? and mine_payment_id is null and ira_payment_id is null",m.atDay(1));
  for(var i:rows)jdbc.update("insert into household_bill_items(id,month,template_id,occurrence_date,category_id,name,split,amount,mine,ira,legacy_transaction_id) values(?,?,?,?,?,?,?,?,?,?,?) on conflict(id) do update set voided=false,amount=excluded.amount,mine=excluded.mine,ira=excluded.ira,legacy_transaction_id=excluded.legacy_transaction_id,name=excluded.name where household_bill_items.mine_payment_id is null and household_bill_items.ira_payment_id is null",i.id(),m.atDay(1),i.templateId(),i.date(),i.categoryId(),i.name(),i.split().name(),i.amount(),i.mine(),i.ira(),i.legacyTransactionId());
 }
 @Transactional public void incomeChanged(String text){lock();var m=parse(text);if(deferrals.hasPlan(m))throw DomainException.conflict("Сначала отмените перенос коммуналки, затем исправьте зарплаты.");if(jdbc.queryForObject("select count(*) from household_bill_payments where month=? and cancelled_at is null",Long.class,m.atDay(1))>0)throw DomainException.conflict("Сначала отмените оплату этого месяца, затем исправьте зарплаты.");
  // An explicit correction of this month's salaries may revise unpaid shares, never other months.
  var income=jdbc.queryForList("select mine,ira from household_monthly_income where month=?",m.atDay(1));if(income.isEmpty())return;
  var mine=(BigDecimal)income.getFirst().get("mine");var ira=(BigDecimal)income.getFirst().get("ira");
  var cumulative=new HashMap<UUID,BigDecimal>();
  for(var i:stored(m.atDay(1),m.atEndOfMonth())){var before=cumulative.getOrDefault(i.categoryId(),ZERO);var after=before.add(i.amount());if(i.split()==HouseholdSplit.PROPORTIONAL)cumulative.put(i.categoryId(),after);if(!i.minePaid()&&!i.iraPaid()){var my=i.split()==HouseholdSplit.EQUAL?HouseholdSplit.half(i.amount()):HouseholdPlanService.share(after,mine,ira);if(my!=null&&i.split()==HouseholdSplit.PROPORTIONAL)my=my.subtract(HouseholdPlanService.share(before,mine,ira));jdbc.update("update household_bill_items set mine=?,ira=? where id=?",my,my==null?null:i.amount().subtract(my),i.id());}}
 }
 private String fingerprint(String month,Pay p){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((month+":"+p.person()+":"+p.accountId()+":"+p.operationDate()+":"+p.expected().stripTrailingZeros()+(p.amount()==null?"":":partial:"+p.amount().stripTrailingZeros())).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 @Transactional public HouseholdDeferralService.Schedule defer(String text,HouseholdDeferralService.Change request,UUID key){lock();var m=parse(text);persist(m);return deferrals.defer(text,view(m).remaining().mine(),request,key);}
 @Transactional public HouseholdDeferralService.Schedule cancelDeferral(String text,HouseholdDeferralService.Undo request){lock();var m=parse(text);return deferrals.cancel(text,view(m).remaining().mine(),request);}
 @Transactional public Payment pay(String text,Pay request,UUID key){return paySelected(text,request,key,null);}
 private Payment paySelected(String text,Pay request,UUID key,Set<UUID> selected){
  if(key==null||request==null||request.person()==null||request.operationDate()==null||request.operationDate().isAfter(LocalDate.now(clock)))throw DomainException.invalid("Invalid monthly payment");
  var m=parse(text);if(m.isAfter(now()))throw DomainException.invalid("Нельзя оплатить будущий месяц.");lock();String fingerprint=fingerprint(text,request);
  if(selected!=null){try{fingerprint=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((fingerprint+":automatic:"+selected.stream().map(UUID::toString).sorted().toList()).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
  var prior=jdbc.queryForList("select id,fingerprint,cancelled_at from household_bill_payments where request_key=?",key);
  if(!prior.isEmpty()){if(!fingerprint.equals(prior.getFirst().get("fingerprint"))||prior.getFirst().get("cancelled_at")!=null)throw DomainException.conflict("Ключ уже использован другим или отменённым платежом.");return payment((UUID)prior.getFirst().get("id"));}
  persist(m);var rows=stored(m.atDay(1),m.atEndOfMonth()).stream().filter(i->selected==null||selected.contains(i.id())).filter(i->request.person()==Person.MINE?!i.minePaid():!i.iraPaid()).toList();
  var remaining=sum(rows,request.person(),true);if(remaining==null)throw DomainException.conflict("Укажите зарплаты за выбранный месяц.");
  if(remaining.compareTo(Money.amount(request.expected(),false))!=0)throw DomainException.conflict("Сумма изменилась. Обновите страницу.");
  if(rows.isEmpty())throw DomainException.conflict("Этот месяц уже оплачен.");
  if(request.person()==Person.IRA&&(request.accountId()!=null||request.amount()!=null))throw DomainException.invalid("Partner payment is recorded for the whole month without charging your account.");
  var amount=request.amount()==null?remaining:Money.amount(request.amount(),true);
  if(amount.compareTo(remaining)>0)throw DomainException.invalid("Платёж больше неоплаченного остатка.");
  if(request.person()==Person.MINE&&amount.signum()>0){if(request.accountId()==null)throw DomainException.invalid("Выберите счёт оплаты.");var a=accounts.lock(request.accountId()).orElseThrow(()->DomainException.missing("Account"));if(!a.isActive()||!a.getCurrency().equals("EUR"))throw DomainException.invalid("Выберите активный счёт EUR.");}
  var id=UUID.randomUUID();jdbc.update("insert into household_bill_payments(id,month,person,request_key,fingerprint,amount,account_id,operation_date) values(?,?,?,?,?,?,?,?)",id,m.atDay(1),request.person().name(),key,fingerprint,amount,request.person()==Person.MINE?request.accountId():null,request.operationDate());
  var left=amount;
  for(var i:rows){
   if(request.person()==Person.IRA){jdbc.update("update household_bill_items set ira_payment_id=? where id=?",id,i.id());continue;}
   var own=i.mineRemaining().min(left);
   if(own.signum()>0){
    var movement=transactions.createScheduled(UUID.nameUUIDFromBytes(("household-settlement:"+id+":"+i.id()).getBytes(StandardCharsets.UTF_8)),new TransactionDto.Write(TransactionType.EXPENSE,own,"EUR",request.accountId(),null,i.categoryId(),FinanceScope.HOUSEHOLD,request.operationDate(),"Коммуналка за "+text+": "+i.name()+" · моя доля",TransactionStatus.CONFIRMED)).transaction();ledger.findById(movement.id()).orElseThrow().linkHouseholdPayment(id);ledger.flush();
    jdbc.update("insert into household_bill_payment_parts(payment_id,item_id,amount) values(?,?,?)",id,i.id(),own);left=left.subtract(own);
   }
   if(own.compareTo(i.mineRemaining())==0)jdbc.update("update household_bill_items set mine_payment_id=? where id=?",id,i.id());
   if(left.signum()==0&&amount.signum()>0)break;
  }
  return payment(id);
 }
 @Transactional public Payment autoMonthly(String text,UUID account,AutomaticFunds funds){
  lock();var m=parse(text);if(m.isAfter(now()))return null;
  if(jdbc.queryForObject("select count(*) from household_bill_payments where month=? and cancelled_at is not null",Long.class,m.atDay(1))>0)return null;
  var eligible=new HashSet<>(jdbc.queryForList("select id from recurring_templates where not deleted and status='ACTIVE' and automatic and frequency='MONTHLY' and scope='HOUSEHOLD' and type='EXPENSE' and currency='EUR' and account_id=?",UUID.class,account));
  var due=items(m).stream().filter(i->eligible.contains(i.templateId())&&!i.minePaid()&&!i.date().isAfter(LocalDate.now(clock))).toList();if(due.isEmpty()||due.stream().anyMatch(i->i.mineRemaining()==null))return null;
  var total=due.stream().map(Item::mineRemaining).reduce(ZERO,BigDecimal::add);var payable=deferrals.schedule(text,view(m).remaining().mine(),now()).payable();if(payable==null)return null;var amount=total.min(payable);
  if(amount.signum()<=0||funds.free(account).compareTo(amount)<0)return null;
  var ids=new HashSet<UUID>();due.forEach(i->ids.add(i.id()));var state=due.stream().sorted(Comparator.comparing(Item::id)).map(i->i.id()+":"+i.mineRemaining()).toList();
  var key=UUID.nameUUIDFromBytes(("balance-monthly-home-auto:"+text+":"+account+":"+state+":"+amount).getBytes(StandardCharsets.UTF_8));
  return paySelected(text,new Pay(Person.MINE,account,LocalDate.now(clock),total,amount),key,ids);
 }
 private Payment payment(UUID id){var rows=jdbc.query("select id,month,person,amount,operation_date,cancelled_at from household_bill_payments where id=?",(rs,n)->new Payment(rs.getObject(1,UUID.class),rs.getObject(2,LocalDate.class).toString().substring(0,7),Person.valueOf(rs.getString(3)),rs.getBigDecimal(4),rs.getObject(5,LocalDate.class),rs.getObject(6)!=null),id);if(rows.isEmpty())throw DomainException.missing("Household payment");return rows.getFirst();}
 @Transactional public Payment cancel(UUID id,Cancel request){lock();var p=payment(id);if(p.cancelled())return p;if(request==null||request.reason()==null||request.reason().isBlank())throw DomainException.invalid("Укажите причину отмены.");for(var tid:jdbc.queryForList("select id from financial_transactions where household_payment_id=? order by id",UUID.class,id)){ledger.lock(tid).orElseThrow().delete();}ledger.flush();jdbc.update("update household_bill_items set mine_payment_id=null where mine_payment_id=?",id);jdbc.update("update household_bill_items set ira_payment_id=null where ira_payment_id=?",id);jdbc.update("update household_bill_payments set cancelled_at=now(),cancellation_reason=? where id=?",request.reason().strip(),id);return payment(id);}
}
