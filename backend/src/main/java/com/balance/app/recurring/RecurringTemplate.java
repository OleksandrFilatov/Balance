package com.balance.app.recurring;

import com.balance.app.transaction.*;
import jakarta.persistence.*;
import java.math.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "recurring_templates")
public class RecurringTemplate {
  @Id UUID id;

  @Column(nullable = false, length = 100)
  String name;

  @Column(nullable = false, length = 1500)
  String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  TransactionType type;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal amount;

  @Column(nullable = false, length = 3)
  String currency;

  @Column(nullable = false)
  UUID accountId;

  @Column(nullable = false)
  UUID categoryId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  FinanceScope scope;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  com.balance.app.account.HouseholdSplit householdSplit;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  Recurrence.Frequency frequency;

  @Column(nullable = false, updatable = false)
  LocalDate originalFirstDate;

  @Column(nullable = false)
  LocalDate firstDate;

  LocalDate endDate;

  LocalDate nextDate;

  @Column(nullable = false)
  long nextIndex;

  @Column(nullable = false, length = 20)
  String status;

  @Column(nullable = false)
  boolean deleted;

  @Column(nullable = false)
  boolean automatic;

  @Column(length = 500)
  String lastError;

  @Column(nullable = false, updatable = false)
  Instant createdAt;

  @Column(nullable = false)
  Instant updatedAt;

  @Version Long version;

  protected RecurringTemplate() {}
}
