package com.balance.app.calendar;

import static com.balance.app.calendar.CalendarDto.*;

import com.balance.app.debt.*;
import com.balance.app.recurring.*;
import com.balance.app.service.*;
import com.balance.app.transaction.TransactionFilters;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CalendarService {
  private static final int MAX_EVENTS = 10000;
  private final CalendarRepository repository;
  private final CalendarMapper mapper;
  private final RecurringService recurring;
  private final Recurrence recurrence;
  private final DebtService debts;
  private final DebtRepository debtRepository;
  private final DebtPaymentRepository payments;
  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final com.balance.app.account.HouseholdBillingService billing;
  private final com.balance.app.account.HouseholdDeferralService deferrals;

  public CalendarService(
      CalendarRepository r,
      CalendarMapper m,
      RecurringService s,
      Recurrence f,
      DebtService d,
      DebtRepository dr,
      DebtPaymentRepository p,
      JdbcTemplate j,
      @Value("${balance.time-zone:Europe/Berlin}") String zone,com.balance.app.account.HouseholdBillingService billing,com.balance.app.account.HouseholdDeferralService deferrals) {
    repository = r;
    mapper = m;
    recurring = s;
    recurrence = f;
    debts = d;
    debtRepository = dr;
    payments = p;
    jdbc = j;
    clock = Clock.system(ZoneId.of(zone));
    this.billing=billing;
    this.deferrals=deferrals;
  }

  private Event planned(RecurringDto.View r, LocalDate date, LocalDate today) {
    var t = r.template();
    boolean next = date.equals(r.nextDate());
    return new Event(
        "recurring/" + r.id() + "/" + date,
        date,
        date,
        t.name(),
        Type.valueOf(t.type().name()),
        date.isBefore(today) ? Status.OVERDUE : Status.PLANNED,
        Source.RECURRING,
        r.id(),
        null,
        null,
        t.accountId(),
        t.amount(),
        r.currency(),
        t.type() == com.balance.app.transaction.TransactionType.INCOME ? Flow.IN : Flow.OUT,
        false,
        next && !date.isAfter(today),
        next,
        r.version(),
        next
            ? "План. Баланс не изменён."
            : "Сначала обработайте предыдущее выполнение расписания.");
  }

  public Report report(
      LocalDate from,
      LocalDate to,
      String currency,
      Type type,
      Status status,
      boolean includeBacklog) {
    if (from == null || to == null) throw DomainException.invalid("Date range required");
    TransactionFilters.dates(from, to);
    if (ChronoUnit.DAYS.between(from, to) > 61)
      throw DomainException.invalid("Calendar range is limited to 62 days");
    Money.currency(currency);
    LocalDate today = LocalDate.now(clock);
    List<Event> all = new ArrayList<>(), backlog = new ArrayList<>();
    all.addAll(repository.transactions(from, to, currency, today));
    all.addAll(repository.payments(from, to, currency));
    all.addAll(repository.reversals(from, to, currency));
    all.addAll(repository.cancellations(from, to, currency));
    for (var r : recurring.list()) {
      if (!r.currency().equals(currency) || !"ACTIVE".equals(r.status()) || r.nextDate() == null)
        continue;
      if (includeBacklog && r.nextDate().isBefore(from) && r.nextDate().isBefore(today))
        backlog.add(planned(r, r.nextDate(), today));
      long index =
          recurrence.onOrAfter(
              r.template().firstDate(),
              r.template().frequency(),
              from.isAfter(r.nextDate()) ? from : r.nextDate());
      for (var date = recurrence.at(r.template().firstDate(), r.template().frequency(), index,r.template().endDate());
          date != null && !date.isAfter(to);
          date = recurrence.at(r.template().firstDate(), r.template().frequency(), ++index,r.template().endDate())) {
        all.add(planned(r, date, today));
        checkSize(all, backlog);
      }
    }
    var monthlyItems=billing.stored(from,to);
    replaceHouseholdPlans(all,monthlyItems,today);
    if(includeBacklog&&from.isAfter(LocalDate.of(1,1,1)))replaceHouseholdPlans(backlog,billing.stored(LocalDate.of(1,1,1),from.minusDays(1)),today);
    var paidDates = repository.paidForDebtDates();
    for (var d : debts.list()) {
      var date = d.terms().nextPayment();
      if (!d.currency().equals(currency) || !"ACTIVE".equals(d.status()) || date == null) continue;
      var paid =
          paidDates.getOrDefault(new CalendarRepository.DebtDate(d.id(), date), BigDecimal.ZERO);
      var monthly = d.terms().monthlyPayment();
      if (monthly != null && paid.compareTo(monthly) >= 0) continue;
      var outstanding = DebtAmounts.due(d,paid);
      if(includeBacklog&&date.isBefore(from)&&date.isBefore(today))backlog.add(debtEvent(d,date,outstanding,today));
      if(monthly==null||!DebtAmounts.interestFree(d.terms())){
        if(!date.isBefore(from)&&!date.isAfter(to))all.add(debtEvent(d,date,outstanding,today));
        continue;
      }
      var anchor=date;long base=0;LocalDate end=null;
      var plans=jdbc.queryForList("select first_date,end_date from debt_monthly_plans where debt_id=?",d.id());
      if(!plans.isEmpty()){
        var first=((java.sql.Date)plans.getFirst().get("first_date")).toLocalDate();
        long completed=d.recordedPrincipal().divideToIntegralValue(monthly).longValueExact();
        if(first.plusMonths(completed).equals(date)){anchor=first;base=completed;end=((java.sql.Date)plans.getFirst().get("end_date")).toLocalDate();}
      }
      long index=Math.max(base,recurrence.onOrAfter(anchor,Recurrence.Frequency.MONTHLY,from));
      long skipped=index-base;
      var consumed=skipped==0?BigDecimal.ZERO:outstanding.add(monthly.multiply(BigDecimal.valueOf(skipped-1)));
      var left=d.remaining().subtract(consumed).max(BigDecimal.ZERO);
      for(;left.signum()>0;index++){
        var occurrence=recurrence.at(anchor,Recurrence.Frequency.MONTHLY,index);
        if(occurrence==null||occurrence.isAfter(to)||end!=null&&occurrence.isAfter(end))break;
        var amount=(index==base?outstanding:monthly).min(left);
        if(amount.signum()>0)all.add(debtEvent(d,occurrence,amount,today));
        left=left.subtract(amount);
      }
    }
    checkSize(all, backlog);
    var comparator = Comparator.comparing(Event::date).thenComparing(Event::id);
    var filtered =
        all.stream()
            .filter(e -> type == null || e.type() == type)
            .filter(e -> status == null || e.status() == status)
            .sorted(comparator)
            .toList();
    var older =
        backlog.stream()
            .filter(e -> type == null || e.type() == type)
            .filter(e -> status == null || e.status() == status)
            .sorted(comparator)
            .toList();
    return new Report(
        from,
        to,
        today,
        clock.getZone().getId(),
        currency,
        mapper.summary(filtered),
        filtered,
        older);
  }

  private void checkSize(List<Event> a, List<Event> b) {
    if (a.size() + b.size() > MAX_EVENTS)
      throw DomainException.invalid("Too many calendar events; shorten the date range");
  }

  private Event debtEvent(DebtDto.View debt,LocalDate date,BigDecimal amount,LocalDate today){
    boolean next=date.equals(debt.terms().nextPayment());
    var title=debt.terms().monthlyPayment()!=null&&amount!=null&&amount.compareTo(debt.terms().monthlyPayment())<0?"Остаток платежа: "+debt.terms().name():debt.terms().name();
    return new Event("debt/"+debt.id()+"/"+date,date,date,title,Type.DEBT,date.isBefore(today)?Status.OVERDUE:Status.PLANNED,Source.DEBT,debt.id(),null,null,null,amount,debt.currency(),Flow.OUT,false,next,false,debt.version(),next?"Ближайший взнос можно оплатить заранее фактической датой. Для долга без месячного взноса показан весь остаток.":"Плановый месячный взнос. Сначала оплатите предыдущий взнос; просмотр не списывает деньги.");
  }

  private void replaceHouseholdPlans(List<Event> events,List<com.balance.app.account.HouseholdBillingService.Item> items,LocalDate today){
    var keys=new HashSet<String>();for(var i:items)keys.add(i.templateId()+":"+i.date());
    events.removeIf(e->e.source()==Source.RECURRING&&e.transactionId()==null&&keys.contains(e.sourceId()+":"+e.scheduledDate()));
    for(var i:items)if(!i.minePaid())events.add(new Event("recurring/"+i.templateId()+"/"+i.date(),i.date(),i.date(),i.name(),Type.EXPENSE,i.date().isBefore(today)?Status.OVERDUE:Status.PLANNED,Source.RECURRING,i.templateId(),null,null,null,i.amount(),"EUR",Flow.OUT,false,false,false,null,"Коммуналка за "+i.month()+". Оплатите месяц одной кнопкой в разделе «Коммуналка и дом»."));
  }

  public Report upcoming(String currency) {
    var today = LocalDate.now(clock);
    var report = report(today, today.plusDays(6), currency, null, null, true);
    var events =
        report.events().stream()
            .filter(e -> !e.posted() && e.status() != Status.CANCELLED && e.type() != Type.TRANSFER)
            .toList();
    return new Report(
        report.from(),
        report.to(),
        today,
        report.zone(),
        currency,
        mapper.summary(events),
        events,
        report.backlog());
  }

  public Obligations obligations(LocalDate from, LocalDate to, String currency) {
    var report = report(from, to, currency, null, null, false);
    var householdRules = new HashMap<UUID,UUID>();
    var householdTransactions = new HashMap<UUID,UUID>();
    var ruleSplits = new HashMap<UUID,com.balance.app.account.HouseholdSplit>();
    var transactionSplits = new HashMap<UUID,com.balance.app.account.HouseholdSplit>();
    jdbc.query("select id,category_id,household_split from recurring_templates where scope='HOUSEHOLD' and type='EXPENSE'",
        rs -> { var id=rs.getObject(1,UUID.class);householdRules.put(id,rs.getObject(2,UUID.class));ruleSplits.put(id,com.balance.app.account.HouseholdSplit.valueOf(rs.getString(3))); });
    jdbc.query("select t.id,t.category_id,coalesce(r.household_split,'EQUAL') from financial_transactions t left join recurring_templates r on r.id=t.recurring_id where t.scope='HOUSEHOLD' and t.type='EXPENSE' and t.currency=? and t.operation_date between ? and ?",
        rs -> { var id=rs.getObject(1,UUID.class);householdTransactions.put(id,rs.getObject(2,UUID.class));transactionSplits.put(id,com.balance.app.account.HouseholdSplit.valueOf(rs.getString(3))); },
        currency, YearMonth.from(from).atDay(1), YearMonth.from(to).atEndOfMonth());
    var shares = new HashMap<String,BigDecimal>();
    for(var event:report.events())
      if(householdCategory(event,householdRules,householdTransactions)!=null && event.amount()!=null &&
          split(event,ruleSplits,transactionSplits)==com.balance.app.account.HouseholdSplit.EQUAL)
        shares.put(event.id(),com.balance.app.account.HouseholdSplit.half(event.amount()));
    var configuredMonths = new HashSet<YearMonth>();
    for (var month = YearMonth.from(from); !month.isAfter(YearMonth.from(to)); month = month.plusMonths(1)) {
      var income = jdbc.queryForList("select mine,ira from household_monthly_income where month=?", month.atDay(1));
      if (income.isEmpty()) continue;
      var mine = (BigDecimal)income.getFirst().get("mine");
      var ira = (BigDecimal)income.getFirst().get("ira");
      if (mine.add(ira).signum() == 0) continue;
      configuredMonths.add(month);
      var monthly = from.equals(month.atDay(1)) && to.equals(month.atEndOfMonth()) ? report :
          report(month.atDay(1), month.atEndOfMonth(), currency, null, null, false);
      var cumulative = new HashMap<UUID,BigDecimal>();
      // Cumulative rounding per category makes daily shares add up to the monthly share.
      // Include completed occurrences so confirming a payment does not redistribute its share.
      for (var event : monthly.events()) {
        var category = householdCategory(event, householdRules, householdTransactions);
        if (category == null || split(event,ruleSplits,transactionSplits)!=com.balance.app.account.HouseholdSplit.PROPORTIONAL || event.amount() == null || event.status() == Status.CANCELLED || event.flow() != Flow.OUT) continue;
        var before = cumulative.getOrDefault(category, BigDecimal.ZERO);
        var after = before.add(event.amount());
        shares.put(event.id(), com.balance.app.account.HouseholdPlanService.share(after,mine,ira)
            .subtract(com.balance.app.account.HouseholdPlanService.share(before,mine,ira)));
        cumulative.put(category,after);
      }
    }
    for(var item:billing.stored(from,to))if(!item.minePaid())shares.put("recurring/"+item.templateId()+"/"+item.date(),item.mineRemaining());
    var byDate = new HashMap<LocalDate,List<Event>>();
    for (var event : report.events()) {
      boolean debt = event.type() == Type.DEBT;
      boolean household = householdCategory(event, householdRules, householdTransactions) != null;
      if (debt || household) byDate.computeIfAbsent(event.date(), ignored -> new ArrayList<>()).add(event);
    }
    var days = new ArrayList<Day>();
    for (var date = from; !date.isAfter(to); date = date.plusDays(1)) {
      var raw = mapper.day(date, byDate.getOrDefault(date, List.of()));
      boolean configured = configuredMonths.contains(YearMonth.from(date));
      BigDecimal personal = BigDecimal.ZERO.setScale(2);
      for (var event : raw.events())
        if (event.type() == Type.EXPENSE && !event.posted() && event.status() != Status.CANCELLED && event.amount()!=null) {
          var value=shares.get(event.id());
          if(value==null){personal=null;break;}
          personal=personal.add(value);
        }
      days.add(mapper.personalDay(raw,personal,configured));
    }
    if("EUR".equals(currency))for(var moved:deferrals.allocations()){
      if(!moved.originalDate().isBefore(from)&&!moved.originalDate().isAfter(to)){
        int index=Math.toIntExact(ChronoUnit.DAYS.between(from,moved.originalDate()));
        days.set(index,shiftHouseholdDay(days.get(index),moved.amount().negate(),null));
      }
      if(!moved.dueDate().isBefore(from)&&!moved.dueDate().isAfter(to)){
        int index=Math.toIntExact(ChronoUnit.DAYS.between(from,moved.dueDate()));
        var event=new Event("household-deferred/"+moved.itemId()+"/"+moved.dueDate(),moved.dueDate(),moved.originalDate(),"Перенесённая коммуналка за "+moved.month(),Type.EXPENSE,moved.dueDate().isBefore(report.asOf())?Status.OVERDUE:Status.PLANNED,Source.RECURRING,moved.templateId(),null,null,null,moved.amount(),"EUR",Flow.OUT,false,false,false,null,"Коммуналка за "+moved.month()+". Перенесена моя доля, это не новое списание.");
        days.set(index,shiftHouseholdDay(days.get(index),moved.amount(),event));
      }
    }
    return new Obligations(from, to, report.asOf(), currency, days);
  }

  private Day shiftHouseholdDay(Day day,BigDecimal amount,Event extra){
    var household=day.householdDue()==null?null:day.householdDue().add(amount).max(BigDecimal.ZERO);
    var events=new ArrayList<>(day.events());if(extra!=null)events.add(extra);
    if(household!=null&&household.signum()==0)events.removeIf(e->e.type()==Type.EXPENSE&&!e.posted()&&(e.status()==Status.PLANNED||e.status()==Status.OVERDUE));
    return new Day(day.date(),day.debtDue(),household,household==null||day.unknownAmounts()>0?null:day.debtDue().add(household),day.paid(),day.unknownAmounts(),List.copyOf(events),day.householdTotal().add(amount).max(BigDecimal.ZERO),day.householdConfigured()||extra!=null);
  }

  private UUID householdCategory(Event event, Map<UUID,UUID> rules, Map<UUID,UUID> transactions) {
    if (event.type() != Type.EXPENSE) return null;
    return event.transactionId() != null ? transactions.get(event.transactionId()) :
        event.source() == Source.RECURRING ? rules.get(event.sourceId()) : null;
  }

  private com.balance.app.account.HouseholdSplit split(Event event,
      Map<UUID,com.balance.app.account.HouseholdSplit> rules,Map<UUID,com.balance.app.account.HouseholdSplit> transactions) {
    return (event.transactionId()!=null?transactions.get(event.transactionId()):rules.get(event.sourceId()));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public DebtDto.Payment confirmDebt(UUID id, DebtConfirm request, UUID key) {
    if (key == null) throw DomainException.invalid("Idempotency key required");
    jdbc.queryForList(
        "select pg_advisory_xact_lock(?)",
        key.getMostSignificantBits() ^ key.getLeastSignificantBits());
    if (payments.findByRequestKey(key).isPresent()) {
      var dates =
          jdbc.queryForList(
              "select scheduled_date from debt_payments where request_key=? and debt_id=?",
              LocalDate.class,
              key,
              id);
      if (dates.isEmpty() || !Objects.equals(dates.getFirst(), request.occurrenceDate()))
        throw DomainException.conflict("Key already used");
      return debts.pay(id, request.payment(), key);
    }
    debtRepository.lock(id).orElseThrow(() -> DomainException.missing("Debt"));
    var d = debts.get(id);
    Money.version(d.version(), request.version());
    var due = request.occurrenceDate();
    var p = request.payment();
    var today = LocalDate.now(clock);
    if (due == null
        || !due.equals(d.terms().nextPayment())
        || !"ACTIVE".equals(d.status()))
      throw DomainException.conflict("Debt event is no longer due");
    var paid =
        repository
            .paidForDebtDates()
            .getOrDefault(new CalendarRepository.DebtDate(id, due), BigDecimal.ZERO);
    if (d.terms().monthlyPayment() != null && paid.compareTo(d.terms().monthlyPayment()) >= 0)
      throw DomainException.conflict("Debt event is no longer due");
    if (p == null || p.operationDate() == null || p.operationDate().isAfter(today))
      throw DomainException.invalid("Actual date must not be in the future");
    if (p.nextPayment() != null && !p.nextPayment().isAfter(due))
      throw DomainException.invalid("Next payment must follow the current due date");
      boolean monthlyPlan=jdbc.queryForObject("select count(*) from debt_monthly_plans where debt_id=?",Long.class,id)>0;
      if (!monthlyPlan && p.principal() != null
        && p.principal().compareTo(d.remaining()) < 0
        && p.nextPayment() == null)
      throw DomainException.invalid("Specify the next due date for a partial debt payment");
    return debts.pay(id, p, key);
  }
}
