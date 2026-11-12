package com.balance.app.recurring;

import com.balance.app.account.*;
import com.balance.app.category.*;
import com.balance.app.service.*;
import com.balance.app.transaction.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class RecurringService {
  private final RecurringRepository templates;
  private final ExecutionRepository executions;
  private final AccountRepository accounts;
  private final CategoryRepository categories;
  private final TransactionService transactions;
  private final TransactionRepository ledger;
  private final TransactionMapper transactionMapper;
  private final RecurringMapper mapper;
  private final Recurrence recurrence;
  private final Clock clock;
  private final boolean autoEnabled;
  private final CancellationRepository cancellations;
  private final HouseholdBillingService billing;
  private final AutomaticFunds funds;

  public RecurringService(
      RecurringRepository r,
      ExecutionRepository e,
      AccountRepository a,
      CategoryRepository c,
      TransactionService t,
      TransactionRepository l,
      TransactionMapper tm,
      RecurringMapper m,
      Recurrence f,
      @Value("${balance.time-zone:Europe/Berlin}") String zone,
      @Value("${balance.recurring.auto-enabled:false}") boolean automatic,
      CancellationRepository cancellations,HouseholdBillingService billing,AutomaticFunds funds) {
    templates = r;
    executions = e;
    accounts = a;
    categories = c;
    transactions = t;
    ledger = l;
    transactionMapper = tm;
    mapper = m;
    recurrence = f;
    clock = Clock.system(ZoneId.of(zone));
    autoEnabled = automatic;
    this.cancellations = cancellations;
    this.billing=billing;
    this.funds=funds;
  }

  private RecurringTemplate getEntity(UUID id) {
    return templates.findById(id).orElseThrow(() -> DomainException.missing("Recurring template"));
  }

  private void apply(RecurringTemplate r, RecurringDto.Write d, boolean active) {
    if (d == null
        || !(d.type() == TransactionType.INCOME || d.type() == TransactionType.EXPENSE)
        || d.scope() == null
        || d.frequency() == null
        || d.firstDate() == null
        || d.firstDate().getYear() < 1
        || d.firstDate().getYear() > 9999)
      throw DomainException.invalid("Invalid recurring schedule");
    r.name = Money.name(d.name());
    r.description = d.description() == null ? "" : d.description().strip();
    if (r.description.length() > 1500) throw DomainException.invalid("Description too long");
    var a = accounts.lock(d.accountId()).orElseThrow(() -> DomainException.missing("Account"));
    var c = categories.lock(d.categoryId()).orElseThrow(() -> DomainException.missing("Category"));
    boolean retainedCategory = c.getId().equals(r.categoryId);
    if ((active && (!a.isActive() || (!c.isActive() && !retainedCategory)))
        || c.getType() != d.type())
      throw DomainException.invalid("Inactive references or wrong category");
    if (c.getId().equals(UUID.fromString("00000000-0000-0000-0003-000000000001")))
      throw DomainException.invalid("Use the specialized debts module for loan payments");
    r.amount = Money.amount(d.amount(), true);
    r.type = d.type();
    r.scope = d.scope();
    r.accountId = a.getId();
    r.currency = a.getCurrency();
    r.categoryId = c.getId();
    var split = d.householdSplit() == null ?
        (r.householdSplit == null ? com.balance.app.account.HouseholdSplit.EQUAL : r.householdSplit) : d.householdSplit();
    if (r.householdSplit != null && r.householdSplit != split)
      throw DomainException.invalid("Payment distribution rule cannot be changed");
    // Explicit group selection is required for newly added fixed charges outside
    // the five defaults. Extra purchases remain EQUAL, including when they use
    // the same expense category as a fixed charge. Existing rules stay immutable.
    if(d.householdGroup()!=null&&!d.householdGroup().equals(split==com.balance.app.account.HouseholdSplit.PROPORTIONAL?"FIXED":"EXTRA"))
      throw DomainException.invalid("Extra purchases must use 50/50; fixed charges use income shares");
    if(split==com.balance.app.account.HouseholdSplit.PROPORTIONAL&&(d.type()!=TransactionType.EXPENSE||d.scope()!=FinanceScope.HOUSEHOLD))
      throw DomainException.invalid("Fixed charges must be household expenses");
    if (split == com.balance.app.account.HouseholdSplit.PROPORTIONAL &&
        !com.balance.app.account.HouseholdSplit.fixedCategory(c.getId()) &&
        !(r.householdSplit==com.balance.app.account.HouseholdSplit.PROPORTIONAL&&c.getId().equals(r.categoryId)) &&
        !"FIXED".equals(d.householdGroup()))
      throw DomainException.invalid("Select the fixed-payment group explicitly; extra purchases are 50/50");
    r.householdSplit = split;
    r.frequency = d.frequency();
    r.firstDate = d.firstDate();
    if(d.endDate()!=null&&(d.endDate().isBefore(d.firstDate())||d.endDate().getYear()>9999))throw DomainException.invalid("Дата окончания должна быть не раньше первой оплаты.");
    r.endDate=d.endDate();
    r.automatic = d.automatic();
    r.updatedAt = Instant.now();
    r.lastError = null;
  }

  public RecurringDto.View create(RecurringDto.Write d) {
    billing.lock();
    RecurringTemplate r = new RecurringTemplate();
    r.id = UUID.randomUUID();
    r.createdAt = Instant.now();
    apply(r, d, true);
    r.originalFirstDate = d.firstDate();
    r.nextDate = d.firstDate();
    r.nextIndex = 0;
    r.status = "ACTIVE";
    return mapper.view(templates.saveAndFlush(r));
  }

  public RecurringDto.View update(UUID id, RecurringDto.Update d) {
    billing.preservePast();
    var r = templates.lock(id).orElseThrow(() -> DomainException.missing("Recurring template"));
    if(r.deleted)throw DomainException.missing("Recurring template");
    Money.version(r.version, d.version());
    if (!Set.of("ACTIVE", "PAUSED", "ARCHIVED").contains(d.status()))
      throw DomainException.invalid("Invalid recurring status");
    boolean changed =
        !r.firstDate.equals(d.template().firstDate()) || r.frequency != d.template().frequency();
    if (changed) {
      LocalDate last = executions.last(id);
      var cancelled = cancellations.last(id);
      if (cancelled != null && (last == null || cancelled.isAfter(last))) last = cancelled;
      if (last != null && !d.template().firstDate().isAfter(last))
        throw DomainException.conflict("New schedule must start after last execution");
    }
    apply(r, d.template(), "ACTIVE".equals(d.status()));
    r.status = d.status();
    if (changed) {
      r.nextIndex = 0;
      r.nextDate = r.firstDate;
    }
    r.nextDate=recurrence.at(r.firstDate,r.frequency,r.nextIndex,r.endDate);
    if(r.nextDate==null)r.status="ARCHIVED";
    templates.flush();
    billing.refreshCurrent();
    return mapper.view(r);
  }

  @Transactional(readOnly = true)
  public List<RecurringDto.View> list() {
    return templates.findAll(Sort.by("createdAt", "id")).stream().filter(r->!r.deleted).map(mapper::view).toList();
  }

  @Transactional(readOnly = true)
  public RecurringDto.View get(UUID id) {
    return get(id,false);
  }

  public RecurringDto.View get(UUID id,boolean includeDeleted) {
    var r=getEntity(id);if(r.deleted&&!includeDeleted)throw DomainException.missing("Recurring template");
    return mapper.view(r);
  }

  public void delete(UUID id,long version) {
    billing.preservePast();
    var r=templates.lock(id).orElseThrow(()->DomainException.missing("Recurring template"));
    if(r.deleted)return;
    Money.version(r.version,version);
    r.deleted=true;r.status="ARCHIVED";r.automatic=false;r.updatedAt=Instant.now();
    templates.flush();
    billing.refreshCurrent();
  }

  public RecurringDto.Execution cancelPayment(UUID id,UUID executionId,RecurringDto.CancelPayment request) {
    billing.lock();
    templates.lock(id).orElseThrow(()->DomainException.missing("Recurring template"));
    var e=executions.findById(executionId).filter(x->x.templateId.equals(id)).orElseThrow(()->DomainException.missing("Execution"));
    if(e.cancelledAt!=null)return execution(e);
    if(request==null||request.reason()==null||request.reason().isBlank()||request.reason().length()>500)throw DomainException.invalid("Reason required");
    var t=ledger.lock(e.transactionId).orElseThrow(()->DomainException.missing("Transaction"));
    if(!id.equals(t.getRecurringId())||t.getDebtId()!=null)throw DomainException.conflict("Wrong payment source");
    t.delete();e.cancelledAt=Instant.now();e.cancellationReason=request.reason().strip();
    ledger.flush();executions.flush();
      billing.voidOccurrence(id,e.occurrenceDate);
    return execution(e);
  }

  private RecurringDto.Execution execution(RecurringExecution e) {
    return new RecurringDto.Execution(
        e.id,
        e.occurrenceDate,
        e.mode,
        e.createdAt,
        transactionMapper.view(ledger.findById(e.transactionId).orElseThrow()),e.cancelledAt!=null,e.cancellationReason);
  }

  private RecurringDto.Cancellation cancellation(RecurringCancellation c) {
    return new RecurringDto.Cancellation(
        c.id, c.templateId, c.occurrenceDate, c.name, c.amount, c.currency, c.reason);
  }

  public RecurringDto.Cancellation cancel(UUID id, RecurringDto.Cancel request) {
    billing.lock();
    var r = templates.lock(id).orElseThrow(() -> DomainException.missing("Recurring template"));
    if (request == null
        || request.occurrenceDate() == null
        || request.reason() == null
        || request.reason().isBlank()
        || request.reason().length() > 500)
      throw DomainException.invalid("Cancellation date and reason required");
    var old = cancellations.findByTemplateIdAndOccurrenceDate(id, request.occurrenceDate());
    if (old.isPresent()) {
      if (!old.get().reason.equals(request.reason().strip()))
        throw DomainException.conflict("Occurrence already cancelled with a different reason");
      return cancellation(old.get());
    }
    if(jdbcMonthlyPaid(id,request.occurrenceDate()))throw DomainException.conflict("Отмените оплату месяца, прежде чем менять этот платёж.");
    Money.version(r.version, request.version());
    if (!"ACTIVE".equals(r.status)
        || !request.occurrenceDate().equals(r.nextDate)
        || executions.findByTemplateIdAndOccurrenceDate(id, request.occurrenceDate()).isPresent())
      throw DomainException.conflict("Only the next unexecuted occurrence can be cancelled");
    var c = new RecurringCancellation();
    c.id = UUID.randomUUID();
    c.templateId = id;
    c.occurrenceDate = r.nextDate;
    c.name = r.name;
    c.type = r.type;
    c.amount = r.amount;
    c.currency = r.currency;
    c.accountId = r.accountId;
    c.reason = request.reason().strip();
    c.createdAt = Instant.now();
    cancellations.saveAndFlush(c);
    billing.voidOccurrence(id,c.occurrenceDate);
    r.nextIndex++;
    r.nextDate = recurrence.at(r.firstDate, r.frequency, r.nextIndex,r.endDate);
    if (r.nextDate == null) r.status = "ARCHIVED";
    r.updatedAt = Instant.now();
    r.lastError = null;
    templates.flush();
    return cancellation(c);
  }

  public RecurringDto.Execution confirm(UUID id, LocalDate expected) {
    return execute(id, expected, false, expected, null);
  }

  public RecurringDto.Execution confirm(UUID id, LocalDate expected, LocalDate actual) {
    return execute(id, expected, false, actual == null ? expected : actual, null);
  }

  public RecurringDto.Execution confirm(
      UUID id, LocalDate expected, LocalDate actual, Long version) {
    return execute(id, expected, false, actual == null ? expected : actual, version);
  }

  private RecurringDto.Execution execute(
      UUID id, LocalDate expected, boolean automatic, LocalDate actual, Long version) {
    return execute(id,expected,automatic,actual,version,false);
  }
  private RecurringDto.Execution execute(UUID id,LocalDate expected,boolean automatic,LocalDate actual,Long version,boolean monthlyOnly){
    billing.lock();
    var r = templates.lock(id).orElseThrow(() -> DomainException.missing("Recurring template"));
    if (expected == null) throw DomainException.invalid("Occurrence date required");
    var old = executions.findByTemplateIdAndOccurrenceDate(id, expected);
    if (old.isPresent()) return execution(old.get());
    if(jdbcMonthlyPaid(id,expected))throw DomainException.conflict("Эта дата оплачена в составе месяца. Используйте историю коммуналки.");
    if (cancellations.findByTemplateIdAndOccurrenceDate(id, expected).isPresent())
      throw DomainException.conflict("Occurrence has been cancelled");
    if (version != null) Money.version(r.version, version);
    if (r.deleted || !"ACTIVE".equals(r.status)
        || r.nextDate == null
        || !r.nextDate.equals(expected)
        || expected.isAfter(LocalDate.now(clock)))
      throw DomainException.conflict("Occurrence is not due or schedule is inactive");
    if (automatic && (!r.automatic || !autoEnabled&&!(monthlyOnly&&r.frequency==Recurrence.Frequency.MONTHLY)))
      throw DomainException.conflict("Automation is disabled");
    if (actual == null
        || actual.getYear() < 1
        || actual.getYear() > 9999
        || actual.isAfter(LocalDate.now(clock)))
      throw DomainException.invalid("Actual date must not be in the future");
    UUID key =
        UUID.nameUUIDFromBytes(
            ("balance-recurring:" + id + ":" + expected).getBytes(StandardCharsets.UTF_8));
    var body =
        new TransactionDto.Write(
            r.type,
            r.amount,
            r.currency,
            r.type == TransactionType.EXPENSE ? r.accountId : null,
            r.type == TransactionType.INCOME ? r.accountId : null,
            r.categoryId,
            r.scope,
            actual,
            r.name + (r.description.isEmpty() ? "" : ": " + r.description),
            TransactionStatus.CONFIRMED);
    var posted = transactions.createScheduled(key, body).transaction();
    var movement = ledger.findById(posted.id()).orElseThrow();
    movement.linkRecurring(id);
    ledger.flush();
    RecurringExecution e = new RecurringExecution();
    e.id = UUID.randomUUID();
    e.templateId = id;
    e.occurrenceDate = expected;
    e.transactionId = posted.id();
    e.mode = automatic ? "AUTOMATIC" : "MANUAL";
    e.createdAt = Instant.now();
    executions.saveAndFlush(e);
    r.nextIndex++;
    r.nextDate = recurrence.at(r.firstDate, r.frequency, r.nextIndex,r.endDate);
    if (r.nextDate == null) r.status = "ARCHIVED";
    r.updatedAt = Instant.now();
    r.lastError = null;
    templates.flush();
    return execution(e);
  }

  public boolean autoOne(UUID id) {if(!autoEnabled)return false;return automatic(id,false);}
  public boolean autoMonthlyOne(UUID id){return automatic(id,true);}
  private boolean automatic(UUID id,boolean monthlyOnly){
    billing.lock();
    var r = templates.lock(id).orElseThrow(() -> DomainException.missing("Recurring template"));
    if(monthlyOnly&&r.frequency!=Recurrence.Frequency.MONTHLY)return false;
    if (!r.automatic
        || !"ACTIVE".equals(r.status)
        || r.nextDate == null
        || r.nextDate.isAfter(LocalDate.now(clock))) return false;
    if(r.type==TransactionType.EXPENSE&&r.scope==FinanceScope.HOUSEHOLD&&r.frequency==Recurrence.Frequency.MONTHLY&&r.currency.equals("EUR"))return false;
    if(r.type==TransactionType.EXPENSE&&funds.free(r.accountId).compareTo(r.amount)<0){r.lastError="Недостаточно свободных денег. Платёж подождёт пополнения, накопления не затрагиваются.";templates.flush();return false;}
    execute(id, r.nextDate, true, LocalDate.now(clock), null,monthlyOnly);
    return true;
  }

  @Transactional(readOnly = true)
  public List<UUID> automaticDue() {
    return autoEnabled ? templates.due(LocalDate.now(clock), PageRequest.of(0, 50)).stream().filter(id->{var r=getEntity(id);return !(r.type==TransactionType.EXPENSE&&r.scope==FinanceScope.HOUSEHOLD&&r.frequency==Recurrence.Frequency.MONTHLY&&r.currency.equals("EUR"));}).toList() : List.of();
  }
  @Transactional(readOnly=true)
  public List<UUID> monthlyDue(){return templates.monthlyDue(LocalDate.now(clock),PageRequest.of(0,50));}

  public void failure(UUID id) {
    var r = templates.lock(id).orElseThrow();
    r.lastError =
        "Автопроведение не выполнено. Проверьте активность счёта и категорию; дата не пропущена.";
    templates.flush();
  }

  private boolean jdbcMonthlyPaid(UUID id,LocalDate date){return date!=null&&billing.stored(date,date).stream().anyMatch(i->i.templateId().equals(id)&&(billing.isDeferred(date)||i.minePaid()||i.iraPaid()||i.mine()!=null&&i.mineRemaining()!=null&&i.mineRemaining().compareTo(i.mine())<0));}
  private boolean jdbcMonthlyOwnerPaid(UUID id,LocalDate date){return date!=null&&billing.stored(date,date).stream().anyMatch(i->i.templateId().equals(id)&&i.minePaid());}

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public RecurringDto.History history(UUID id, int page, int size) {
    getEntity(id);
    if (page < 0 || size < 1 || size > 200) throw DomainException.invalid("Invalid pagination");
    var p =
        executions.findByTemplateId(
            id,
            PageRequest.of(
                page, size, Sort.by(Sort.Order.desc("occurrenceDate"), Sort.Order.desc("id"))));
    return new RecurringDto.History(
        p.getContent().stream().map(this::execution).toList(), page, size, p.getTotalElements());
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public RecurringDto.Upcoming upcoming(int days) {
    if (!Set.of(7, 30, 90).contains(days)) throw DomainException.invalid("Use 7, 30 or 90 days");
    LocalDate today = LocalDate.now(clock), end = today.plusDays(days - 1);
    List<RecurringDto.Planned> events = new ArrayList<>(), overdue = new ArrayList<>();
    boolean truncated = false;
    for (var r : templates.findAll(Sort.by("createdAt", "id"))) {
      if (!"ACTIVE".equals(r.status) || r.nextDate == null) continue;
      if (r.nextDate.isBefore(today)&&!jdbcMonthlyOwnerPaid(r.id,r.nextDate)) overdue.add(mapper.planned(r, r.nextDate, true));
      long index = Math.max(r.nextIndex, recurrence.onOrAfter(r.firstDate, r.frequency, today));
      for (LocalDate date = recurrence.at(r.firstDate, r.frequency, index,r.endDate);
          date != null && !date.isAfter(end);
          date = recurrence.at(r.firstDate, r.frequency, ++index,r.endDate)) {
        if (events.size() >= 5000) {
          truncated = true;
          break;
        }
        if(!jdbcMonthlyOwnerPaid(r.id,date))events.add(mapper.planned(r, date, false));
      }
    }
    events.sort(
        Comparator.comparing(RecurringDto.Planned::date).thenComparing(RecurringDto.Planned::name));
    overdue.sort(Comparator.comparing(RecurringDto.Planned::date));
    return new RecurringDto.Upcoming(today, days, autoEnabled, events, overdue, truncated);
  }

  @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
  public RecurringDto.MonthPlan monthPlan(){
    var today=LocalDate.now(clock);var month=YearMonth.from(today);var events=new ArrayList<RecurringDto.Planned>();var overdue=new ArrayList<RecurringDto.Planned>();boolean truncated=false;
    for(var r:templates.findAll(Sort.by("createdAt","id"))){
      if(r.deleted||!"ACTIVE".equals(r.status)||r.nextDate==null)continue;
      if(r.nextDate.isBefore(month.atDay(1))&&!jdbcMonthlyOwnerPaid(r.id,r.nextDate))overdue.add(mapper.planned(r,r.nextDate,true));
      long index=Math.max(r.nextIndex,recurrence.onOrAfter(r.firstDate,r.frequency,month.atDay(1)));
      for(var date=recurrence.at(r.firstDate,r.frequency,index,r.endDate);date!=null&&!date.isAfter(month.atEndOfMonth());date=recurrence.at(r.firstDate,r.frequency,++index,r.endDate)){
        if(events.size()>=5000){truncated=true;break;}
        if(!jdbcMonthlyOwnerPaid(r.id,date))events.add(mapper.planned(r,date,date.isBefore(today)));
      }
    }
    events.sort(Comparator.comparing(RecurringDto.Planned::date).thenComparing(RecurringDto.Planned::name));overdue.sort(Comparator.comparing(RecurringDto.Planned::date));
    return new RecurringDto.MonthPlan(month.toString(),today,events,overdue,truncated);
  }
}
