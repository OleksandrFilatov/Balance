package com.balance.app.budget;

import com.balance.app.transaction.FinanceScope;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "monthly_budgets")
public class Budget {
  @Id UUID id;

  @Column(nullable = false, updatable = false)
  LocalDate month;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false, length = 20)
  FinanceScope scope;

  @Column(nullable = false, updatable = false, length = 3)
  String currency = "EUR";

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal plannedIncome;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal plannedExpense;

  @Column(nullable = false, updatable = false)
  Instant createdAt;

  @Column(nullable = false)
  Instant updatedAt;

  @Version Long version;

  @ElementCollection
  @CollectionTable(name = "budget_category_limits", joinColumns = @JoinColumn(name = "budget_id"))
  @MapKeyColumn(name = "category_id")
  @Column(name = "amount", nullable = false, precision = 19, scale = 2)
  Map<UUID, BigDecimal> limits = new HashMap<>();
}
