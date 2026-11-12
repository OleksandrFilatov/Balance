package com.balance.app.transaction;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository
    extends JpaRepository<FinancialTransaction, UUID>,
        JpaSpecificationExecutor<FinancialTransaction> {
  Optional<FinancialTransaction> findByCreateKey(UUID createKey);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from FinancialTransaction t where t.id=:id")
  Optional<FinancialTransaction> lock(@Param("id") UUID id);

  @Query(
      value =
          """
          select
            coalesce(sum(case when type='INCOME' then amount else 0 end),0) as income,
            coalesce(sum(case when type='EXPENSE' then amount else 0 end),0) as expense,
            coalesce(sum(case when type='EXPENSE' and scope='PERSONAL' then amount else 0 end),0) as personalExpense,
            coalesce(sum(case when type='EXPENSE' and scope='HOUSEHOLD' then amount else 0 end),0) as householdExpense
          from financial_effects
          where deleted=false and status='CONFIRMED' and currency=:currency
            and operation_date between :fromDate and :toDate
          """,
      nativeQuery = true)
  SummaryRow summary(
      @Param("fromDate") java.time.LocalDate from,
      @Param("toDate") java.time.LocalDate to,
      @Param("currency") String currency);

  interface SummaryRow {
    java.math.BigDecimal getIncome();

    java.math.BigDecimal getExpense();

    java.math.BigDecimal getPersonalExpense();

    java.math.BigDecimal getHouseholdExpense();
  }

  @Query(
      value =
          """
          select operation_date as date, sum(amount) as amount
          from financial_effects
          where deleted=false and status='CONFIRMED' and type='EXPENSE'
            and currency=:currency and operation_date between :fromDate and :toDate
          group by operation_date order by operation_date
          """,
      nativeQuery = true)
  List<DailyExpenseRow> dailyExpenses(
      @Param("fromDate") java.time.LocalDate from,
      @Param("toDate") java.time.LocalDate to,
      @Param("currency") String currency);

  @Query(
      value =
          """
          select c.id as categoryId, c.name as name, sum(t.amount) as amount
          from financial_effects t join categories c on c.id=t.category_id
          where t.deleted=false and t.status='CONFIRMED' and t.type='EXPENSE'
            and t.currency=:currency and t.operation_date between :fromDate and :toDate
          group by c.id, c.name order by sum(t.amount) desc, c.id
          """,
      nativeQuery = true)
  List<CategoryExpenseRow> categoryExpenses(
      @Param("fromDate") java.time.LocalDate from,
      @Param("toDate") java.time.LocalDate to,
      @Param("currency") String currency);

  interface DailyExpenseRow {
    java.time.LocalDate getDate();

    java.math.BigDecimal getAmount();
  }

  interface CategoryExpenseRow {
    UUID getCategoryId();

    String getName();

    java.math.BigDecimal getAmount();
  }
}
