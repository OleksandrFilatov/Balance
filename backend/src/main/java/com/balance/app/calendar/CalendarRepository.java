package com.balance.app.calendar;

import static com.balance.app.calendar.CalendarDto.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CalendarRepository {
  private final JdbcTemplate jdbc;

  public CalendarRepository(JdbcTemplate j) {
    jdbc = j;
  }

  public List<Event> transactions(LocalDate from, LocalDate to, String currency, LocalDate today) {
    return jdbc.query(
        """
        select t.*,e.occurrence_date,c.name as category_name
        from financial_transactions t left join recurring_executions e on e.transaction_id=t.id
        left join categories c on c.id=t.category_id
        where t.operation_date between ? and ? and t.currency=?
        and (t.debt_id is null or t.type='LOAN_RECEIPT')
        order by t.operation_date,t.id limit 10001
        """,
        (rs, n) -> {
          var id = rs.getObject("id", UUID.class);
          var rule = rs.getObject("recurring_id", UUID.class);
          var date = rs.getObject("operation_date", LocalDate.class);
          var scheduled = rs.getObject("occurrence_date", LocalDate.class);
          var type =
              "OPENING_ADJUSTMENT".equals(rs.getString("type"))
                  ? Type.ADJUSTMENT
                  : "LOAN_RECEIPT".equals(rs.getString("type"))
                      ? Type.LOAN
                      : Type.valueOf(rs.getString("type"));
          boolean deleted = rs.getBoolean("deleted"),
              posted = !deleted && "CONFIRMED".equals(rs.getString("status"));
          var status =
              deleted
                  ? Status.CANCELLED
                  : posted
                      ? Status.COMPLETED
                      : date.isBefore(today) ? Status.OVERDUE : Status.PLANNED;
          var description = rs.getString("description");
          var title =
              description.isBlank()
                  ? Objects.toString(rs.getString("category_name"), rs.getString("type"))
                  : description;
          var debit = rs.getObject("debit_account_id", UUID.class);
          var flow =
              type == Type.TRANSFER || type == Type.ADJUSTMENT
                  ? Flow.INTERNAL
                  : debit == null ? Flow.IN : Flow.OUT;
          return new Event(
              rule == null ? "transaction/" + id : "recurring/" + rule + "/" + scheduled,
              date,
              scheduled,
              title,
              type,
              status,
              rule == null ? Source.TRANSACTION : Source.RECURRING,
              rule == null ? id : rule,
              id,
              null,
              debit == null ? rs.getObject("credit_account_id", UUID.class) : debit,
              rs.getBigDecimal("amount"),
              currency,
              flow,
              posted,
              !deleted && !posted && !date.isAfter(today),
              !deleted && !posted,
              rs.getLong("version"),
              deleted ? "Операция отменена; в текущие остатки не входит." : "");
        },
        from,
        to,
        currency);
  }

  public List<Event> payments(LocalDate from, LocalDate to, String currency) {
    return jdbc.query(
        """
        select p.*,d.name,r.reason,r.operation_date as reversal_date
        from debt_payments p join debts d on d.id=p.debt_id
        left join debt_payment_reversals r on r.payment_id=p.id
        where p.operation_date between ? and ? and d.currency=? order by p.operation_date,p.id limit 10001
        """,
        (rs, n) -> {
          var id = rs.getObject("id", UUID.class);
          var reversed = rs.getObject("reversal_date") != null;
          return new Event(
              "debt-payment/" + id,
              rs.getObject("operation_date", LocalDate.class),
              rs.getObject("scheduled_date", LocalDate.class),
              "Платёж: " + rs.getString("name"),
              Type.DEBT,
              reversed ? Status.CANCELLED : Status.COMPLETED,
              Source.DEBT_PAYMENT,
              rs.getObject("debt_id", UUID.class),
              null,
              id,
              rs.getObject("account_id", UUID.class),
              rs.getBigDecimal("principal").add(rs.getBigDecimal("interest")),
              currency,
              Flow.OUT,
              true,
              false,
              false,
              null,
              "Основной долг: "
                  + rs.getBigDecimal("principal")
                  + "; проценты: "
                  + rs.getBigDecimal("interest")
                  + (reversed
                      ? ". Сторнирован "
                          + rs.getObject("reversal_date")
                          + ": "
                          + rs.getString("reason")
                      : ""));
        },
        from,
        to,
        currency);
  }

  public List<Event> reversals(LocalDate from, LocalDate to, String currency) {
    return jdbc.query(
        """
        select r.*,p.debt_id,p.account_id,p.principal,p.interest,d.name from debt_payment_reversals r
        join debt_payments p on p.id=r.payment_id join debts d on d.id=p.debt_id
        where r.operation_date between ? and ? and d.currency=? order by r.operation_date,r.id limit 10001
        """,
        (rs, n) ->
            new Event(
                "debt-reversal/" + rs.getObject("id"),
                rs.getObject("operation_date", LocalDate.class),
                null,
                "Сторно: " + rs.getString("name"),
                Type.REVERSAL,
                Status.COMPLETED,
                Source.DEBT_REVERSAL,
                rs.getObject("debt_id", UUID.class),
                null,
                rs.getObject("payment_id", UUID.class),
                rs.getObject("account_id", UUID.class),
                rs.getBigDecimal("principal").add(rs.getBigDecimal("interest")),
                currency,
                Flow.IN,
                true,
                false,
                false,
                null,
                rs.getString("reason")),
        from,
        to,
        currency);
  }

  public List<Event> cancellations(LocalDate from, LocalDate to, String currency) {
    return jdbc.query(
        """
        select * from recurring_cancellations where occurrence_date between ? and ? and currency=?
        order by occurrence_date,id limit 10001
        """,
        (rs, n) ->
            new Event(
                "recurring/" + rs.getObject("template_id") + "/" + rs.getObject("occurrence_date"),
                rs.getObject("occurrence_date", LocalDate.class),
                rs.getObject("occurrence_date", LocalDate.class),
                rs.getString("name"),
                Type.valueOf(rs.getString("type")),
                Status.CANCELLED,
                Source.RECURRING,
                rs.getObject("template_id", UUID.class),
                null,
                null,
                rs.getObject("account_id", UUID.class),
                rs.getBigDecimal("amount"),
                currency,
                "INCOME".equals(rs.getString("type")) ? Flow.IN : Flow.OUT,
                false,
                false,
                false,
                null,
                rs.getString("reason")),
        from,
        to,
        currency);
  }

  public record DebtDate(UUID debtId, LocalDate date) {}

  public Map<DebtDate, BigDecimal> paidForDebtDates() {
    Map<DebtDate, BigDecimal> result = new HashMap<>();
    jdbc.query(
        """
        select p.debt_id,p.scheduled_date,sum(p.principal+p.interest) as paid from debt_payments p
        where p.scheduled_date is not null and not exists(select 1 from debt_payment_reversals r where r.payment_id=p.id)
        group by p.debt_id,p.scheduled_date
        """,
        rs -> {
          result.put(
              new DebtDate(
                  rs.getObject("debt_id", UUID.class),
                  rs.getObject("scheduled_date", LocalDate.class)),
              rs.getBigDecimal("paid"));
        });
    return result;
  }
}
