package com.balance.app.account;

import com.balance.app.calendar.CalendarRepository;
import com.balance.app.category.CategoryRepository;
import com.balance.app.debt.DebtService;
import com.balance.app.recurring.*;
import com.balance.app.service.*;
import com.balance.app.transaction.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Presentation facade over existing services. No independent balances or financial plans. */
@Service
@Transactional
public class PersonalMoneyService {
  private final AccountService accountService;
  private final AccountRepository accounts;
  private final TransactionService transactions;
  private final TransactionRepository ledger;
  private final TransactionMapper mapper;
  private final RecurringService recurring;
  private final Recurrence recurrence;
  private final DebtService debts;
  private final CalendarRepository calendar;
  private final CategoryRepository categories;
  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final com.balance.app.calendar.CalendarService personalCalendar;

  public PersonalMoneyService(
      AccountService a,
      AccountRepository ar,
      TransactionService t,
      TransactionRepository l,
      TransactionMapper m,
      RecurringService r,
      Recurrence f,
      DebtService d,
      CalendarRepository c,
      CategoryRepository cr,
      JdbcTemplate j,
      @Value("${balance.time-zone:Europe/Berlin}") String zone,
      com.balance.app.calendar.CalendarService personalCalendar) {
    accountService = a;
    accounts = ar;
    transactions = t;
    ledger = l;
    mapper = m;
    recurring = r;
    recurrence = f;
    debts = d;
    calendar = c;
    categories = cr;
    jdbc = j;
    clock = Clock.system(ZoneId.of(zone));
    this.personalCalendar = personalCalendar;
  }

  private UUID preferred() {
    var ids =
        jdbc.queryForList(
            "select default_account_id from owner_money_settings where id=true and"
                + " default_account_id is not null",
            UUID.class);
    if (!ids.isEmpty() && accounts.findById(ids.getFirst()).filter(Account::isActive).isPresent())
      return ids.getFirst();
    var active = accounts.findAll().stream().filter(Account::isActive).toList();
    return active.size() == 1 ? active.getFirst().getId() : null;
  }

  public AccountDto.View defaultAccount(PersonalMoneyDto.DefaultAccount request) {
    jdbc.queryForList("select pg_advisory_xact_lock(?)", 682150198631L);
    AccountDto.View a;
    if (request.accountId() != null) {
      a = accountService.get(request.accountId());
      if (!a.active()) throw DomainException.invalid("Account is inactive");
    } else {
      var id = preferred();
      if (id != null) return accountService.get(id);
      if (accounts.count() != 0)
        throw DomainException.conflict("Select an existing account; no accounts were merged");
      a =
          accountService.create(
              new AccountDto.Create("Мои деньги", AccountType.CASH, "EUR", BigDecimal.ZERO));
    }
    jdbc.update(
        "insert into owner_money_settings(id,default_account_id) values(true,?) on conflict(id) do"
            + " update set default_account_id=excluded.default_account_id",
        a.id());
    return a;
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PersonalMoneyDto.Opening opening(UUID id) {
    var a = accountService.get(id);
    var delta =
        jdbc.queryForObject(
            "select coalesce(sum(case when credit_account_id=? then amount else -amount end),0)"
                + " from financial_transactions where type='OPENING_ADJUSTMENT' and"
                + " status='CONFIRMED' and not deleted and (credit_account_id=? or"
                + " debit_account_id=?)",
            BigDecimal.class,
            id,
            id,
            id);
    return new PersonalMoneyDto.Opening(
        id, a.initialBalance(), a.initialBalance().add(delta), a.currency());
  }

  public TransactionDto.View correctOpening(
      UUID id, PersonalMoneyDto.CorrectOpening request, UUID key) {
    if (key == null) throw DomainException.invalid("Idempotency key required");
    var expected = Money.amount(request.expected(), false);
    var corrected = Money.amount(request.corrected(), false);
    var reason = request.reason() == null ? "" : request.reason().strip();
    if (reason.isEmpty() || reason.length() > 500) throw DomainException.invalid("Reason required");
    String fingerprint;
    try {
      fingerprint =
          HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(
                          ("opening:" + id + ":" + expected + ":" + corrected + ":" + reason)
                              .getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
    jdbc.queryForList(
        "select pg_advisory_xact_lock(?)",
        key.getMostSignificantBits() ^ key.getLeastSignificantBits());
    var old = ledger.findByCreateKey(key);
    if (old.isPresent()) {
      if (!old.get().getCreateFingerprint().equals(fingerprint))
        throw DomainException.conflict("Key already used");
      return mapper.view(old.get());
    }
    var a = accounts.lock(id).orElseThrow(() -> DomainException.missing("Account"));
    if (!a.isActive()) throw DomainException.conflict("Account is inactive");
    if (opening(id).effective().compareTo(expected) != 0)
      throw DomainException.conflict("Opening amount changed; reload before correcting");
    var delta = corrected.subtract(expected);
    var amount = Money.amount(delta.abs(), true);
    var t = new FinancialTransaction(key, fingerprint);
    t.apply(
        new TransactionDto.Write(
            TransactionType.OPENING_ADJUSTMENT,
            amount,
            a.getCurrency(),
            delta.signum() < 0 ? id : null,
            delta.signum() > 0 ? id : null,
            null,
            null,
            LocalDate.now(clock),
            "Корректировка начального остатка: " + expected + " → " + corrected + ". " + reason,
            TransactionStatus.CONFIRMED),
        delta.signum() < 0 ? a : null,
        delta.signum() > 0 ? a : null,
        null);
    return mapper.view(ledger.saveAndFlush(t));
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PersonalMoneyDto.Overview overview(String currency) {
    return overviewUntil(currency, YearMonth.now(clock).atEndOfMonth());
  }

  /** Read-only cumulative obligations; no scheduled operations are posted by this calculation. */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PersonalMoneyDto.Overview overviewUntil(String currency, LocalDate end) {
    return overviewUntil(currency,end,new HashMap<>());
  }

  PersonalMoneyDto.Overview overviewUntil(String currency,LocalDate end,
      Map<YearMonth,com.balance.app.calendar.CalendarDto.Obligations> monthlyObligations) {
    Money.currency(currency);
    var today = LocalDate.now(clock);
    if (end == null || end.isBefore(today) || end.isAfter(YearMonth.from(today).plusMonths(24).atEndOfMonth()))
      throw DomainException.invalid("Projection is limited to the next 24 months");
    var summary = transactions.summary(YearMonth.from(end).atDay(1), end, currency);
    var balance =
        accountService
            .balances()
            .totalsByCurrency()
            .getOrDefault(currency, BigDecimal.ZERO.setScale(2));
    var due = BigDecimal.ZERO.setScale(2);
    var deductions=new ArrayList<PersonalMoneyDto.Deduction>();
    long unknown = 0;
    var first = today.withDayOfMonth(1);
    for (var r : recurring.list()) {
      if (!"ACTIVE".equals(r.status()) || r.nextDate()==null || r.nextDate().isAfter(end)
          || !r.currency().equals(currency) || r.template().type()!=TransactionType.EXPENSE) continue;
      if (r.template().scope()==FinanceScope.HOUSEHOLD) {
        if(r.nextDate().isBefore(first))first=r.nextDate();
      } else {
        long count=recurrence.count(r.template().firstDate(),r.template().frequency(),r.nextDate(),end,r.template().endDate());
        var amount=r.template().amount().multiply(BigDecimal.valueOf(count));
        due=due.add(amount);
        if(amount.signum()>0)deductions.add(new PersonalMoneyDto.Deduction("PERSONAL",r.template().name(),r.nextDate(),amount,"/personal-expenses"));
      }
    }
    for(var debt:debts.list())if(debt.currency().equals(currency)&&"ACTIVE".equals(debt.status())&&debt.terms().nextPayment()!=null&&debt.terms().nextPayment().isBefore(first))first=debt.terms().nextPayment();
    var pendingFirst=jdbc.queryForObject("select min(operation_date) from financial_transactions where type='EXPENSE' and scope='HOUSEHOLD' and status='PENDING' and not deleted and currency=? and operation_date<=?",LocalDate.class,currency,end);
    if(pendingFirst!=null&&pendingFirst.isBefore(first))first=pendingFirst;
    if(currency.equals("EUR")){var billingFirst=jdbc.queryForObject("select min(occurrence_date) from household_bill_items where not voided and mine_payment_id is null and legacy_transaction_id is null and occurrence_date<=?",LocalDate.class,end);if(billingFirst!=null&&billingFirst.isBefore(first))first=billingFirst;}
    for(var month=YearMonth.from(first);!month.isAfter(YearMonth.from(end));month=month.plusMonths(1)) {
      var obligations=monthlyObligations.computeIfAbsent(month,key->personalCalendar.obligations(key.atDay(1),key.atEndOfMonth(),currency));
      for(var day:obligations.days()) {
        due=due.add(day.householdDue()==null?BigDecimal.ZERO:day.householdDue());
        if(day.householdDue()==null)for(var event:day.events())if(event.id().startsWith("household-deferred/")&&event.amount()!=null){due=due.add(event.amount());deductions.add(new PersonalMoneyDto.Deduction("HOUSEHOLD",event.title(),day.date(),event.amount(),"/household?month="+YearMonth.from(event.scheduledDate())));}
        if(day.householdDue()==null||day.householdDue().signum()>0)appendHouseholdDeductions(deductions,day,currency);
        unknown+=day.events().stream().filter(e->e.type()!=com.balance.app.calendar.CalendarDto.Type.DEBT&&e.amount()==null&&e.flow()==com.balance.app.calendar.CalendarDto.Flow.OUT&&e.status()!=com.balance.app.calendar.CalendarDto.Status.CANCELLED).count();
        if(day.householdDue()==null)unknown++;
      }
    }
    for(var debt:debts.list()) {
      if(!debt.currency().equals(currency)||!"ACTIVE".equals(debt.status())||debt.terms().nextPayment()==null||debt.terms().nextPayment().isAfter(end))continue;
      var plans=jdbc.queryForList("select first_date,end_date,monthly_amount from debt_monthly_plans where debt_id=?",debt.id());
      BigDecimal amount;
      if(!plans.isEmpty()) {
        // nextPayment is the next unpaid installment, including a partially paid one.
        // An old first_date must not invent an extra overdue installment when nextPayment was moved.
        var monthly=(BigDecimal)plans.getFirst().get("monthly_amount");
        var start=debt.terms().nextPayment();
        long count=java.time.temporal.ChronoUnit.MONTHS.between(YearMonth.from(start),YearMonth.from(end))+1;
        if(count>0&&start.plusMonths(count-1).isAfter(end))count--;
        var partial=debt.recordedPrincipal().remainder(monthly);
        amount=monthly.multiply(BigDecimal.valueOf(Math.max(0,count))).subtract(partial).max(BigDecimal.ZERO).min(debt.remaining());
      } else {
        var paid=jdbc.queryForObject("select coalesce(sum(p.principal+p.interest),0) from debt_payments p where p.debt_id=? and p.scheduled_date=? and not exists(select 1 from debt_payment_reversals r where r.payment_id=p.id)",BigDecimal.class,debt.id(),debt.terms().nextPayment());
        amount=debt.terms().monthlyPayment()==null?debt.remaining():debt.terms().monthlyPayment().subtract(paid).max(BigDecimal.ZERO).min(debt.remaining());
        if(end.isAfter(YearMonth.from(today).atEndOfMonth()) && debt.terms().monthlyPayment()!=null
            && (debt.terms().annualRate()==null || debt.terms().annualRate().signum()==0)) {
          var start=debt.terms().nextPayment();
          long count=java.time.temporal.ChronoUnit.MONTHS.between(YearMonth.from(start),YearMonth.from(end))+1;
          if(count>0 && start.plusMonths(count-1).isAfter(end))count--;
          amount=debt.terms().monthlyPayment().multiply(BigDecimal.valueOf(Math.max(0,count))).subtract(paid).max(BigDecimal.ZERO).min(debt.remaining());
        }
      }
      due=due.add(amount);
      if(amount.signum()>0)deductions.add(new PersonalMoneyDto.Deduction("DEBT",debt.terms().name(),debt.terms().nextPayment(),amount,"/debts/"+debt.id()));
    }
    var pending=jdbc.queryForList("select description,operation_date,amount from financial_transactions where type='EXPENSE' and scope='PERSONAL' and status='PENDING' and not deleted and currency=? and operation_date<=? order by operation_date,id",currency,end);
    for(var row:pending){var amount=(BigDecimal)row.get("amount");due=due.add(amount);var name=(String)row.get("description");deductions.add(new PersonalMoneyDto.Deduction("PERSONAL",name==null||name.isBlank()?"Ожидающий личный расход":name,((java.sql.Date)row.get("operation_date")).toLocalDate(),amount,"/money"));}
    deductions.sort(Comparator.comparing(PersonalMoneyDto.Deduction::date).thenComparing(PersonalMoneyDto.Deduction::name));
    return new PersonalMoneyDto.Overview(
        currency,
        today,
        end,
        balance,
        summary.income(),
        summary.expense(),
        due,
        unknown==0 ? balance.subtract(due) : null,
        unknown,
        preferred(),List.copyOf(deductions));
  }

  private void appendHouseholdDeductions(List<PersonalMoneyDto.Deduction> items,com.balance.app.calendar.CalendarDto.Day day,String currency){
    String href="/household?month="+YearMonth.from(day.date());
    if("EUR".equals(currency)&&day.householdDue()!=null){
      var rows=jdbc.queryForList("select name,mine from household_bill_items where occurrence_date=? and not voided and mine_payment_id is null and legacy_transaction_id is null order by name,id",day.date());
      boolean known=!rows.isEmpty()&&rows.stream().allMatch(r->r.get("mine")!=null);
      var sum=rows.stream().map(r->(BigDecimal)r.get("mine")).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add);
      if(known&&sum.compareTo(day.householdDue())==0){for(var row:rows){var amount=(BigDecimal)row.get("mine");if(amount.signum()>0)items.add(new PersonalMoneyDto.Deduction("HOUSEHOLD",(String)row.get("name"),day.date(),amount,href));}return;}
    }
    String name=day.events().stream().filter(e->e.type()==com.balance.app.calendar.CalendarDto.Type.EXPENSE&&!e.posted()&&(e.status()==com.balance.app.calendar.CalendarDto.Status.PLANNED||e.status()==com.balance.app.calendar.CalendarDto.Status.OVERDUE)).map(com.balance.app.calendar.CalendarDto.Event::title).distinct().collect(java.util.stream.Collectors.joining(", "));
    items.add(new PersonalMoneyDto.Deduction("HOUSEHOLD",name.isBlank()?"Моя доля домашних платежей":name,day.date(),day.householdDue(),href));
  }

  private static final String[]
      KEYS = {"rent", "electricity", "water", "internet", "food", "subscriptions", "other"},
      NAMES =
          {
            "Аренда",
            "Электричество",
            "Вода",
            "Интернет",
            "Продукты",
            "Подписки",
            "Другие домашние расходы"
          };

  private int section(UUID id, String name) {
    String v = id.toString();
    if (v.equals("00000000-0000-0000-0001-000000000002")) return 0;
    if (v.equals("00000000-0000-0000-0001-000000000003")) return 1;
    if (v.equals("00000000-0000-0000-0001-000000000004")) return 3;
    if (v.equals("00000000-0000-0000-0001-000000000001")) return 4;
    if (v.equals("00000000-0000-0000-0004-000000000001") || name.equalsIgnoreCase("Вода")) return 2;
    if (v.equals("00000000-0000-0000-0004-000000000002") || name.equalsIgnoreCase("Подписки"))
      return 5;
    return 6;
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public PersonalMoneyDto.Household household(String month) {
    YearMonth ym;
    try {
      if (month == null || !month.matches("[0-9]{4}-(0[1-9]|1[0-2])"))
        throw new IllegalArgumentException();
      ym = YearMonth.parse(month);
      if (ym.getYear() < 1) throw new IllegalArgumentException();
    } catch (Exception e) {
      throw DomainException.invalid("Use month YYYY-MM");
    }
    BigDecimal[] sums = new BigDecimal[7];
    Arrays.fill(sums, BigDecimal.ZERO.setScale(2));
    UUID[] ids = new UUID[7];
    for (var c : categories.findAll())
      if (c.getType() == TransactionType.EXPENSE
          && c.isActive()
          && !c.getId().toString().equals("00000000-0000-0000-0003-000000000001")) {
        int i = section(c.getId(), c.getName());
        if (ids[i] == null
            || c.getName().equalsIgnoreCase(NAMES[i])
            || (i == 6 && c.getId().toString().equals("00000000-0000-0000-0001-000000000009")))
          ids[i] = c.getId();
      }
    jdbc.query(
        "select c.id,c.name,sum(t.amount) as amount from financial_effects t join categories c on"
            + " c.id=t.category_id where t.type='EXPENSE' and t.status='CONFIRMED' and not"
            + " t.deleted and t.scope='HOUSEHOLD' and t.currency='EUR' and t.operation_date between"
            + " ? and ? group by c.id,c.name",
        rs -> {
          int i = section(rs.getObject("id", UUID.class), rs.getString("name"));
          sums[i] = sums[i].add(rs.getBigDecimal("amount"));
        },
        ym.atDay(1),
        ym.atEndOfMonth());
    List<PersonalMoneyDto.Section> rows = new ArrayList<>();
    for (int i = 0; i < 7; i++)
      rows.add(new PersonalMoneyDto.Section(KEYS[i], NAMES[i], ids[i], sums[i]));
    return new PersonalMoneyDto.Household(
        month, Arrays.stream(sums).reduce(BigDecimal.ZERO, BigDecimal::add), rows);
  }
}
