package com.balance.app.recurring;

import com.balance.app.transaction.TransactionType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "recurring_cancellations")
public class RecurringCancellation {
  @Id UUID id;

  @Column(nullable = false)
  UUID templateId;

  @Column(nullable = false)
  LocalDate occurrenceDate;

  @Column(nullable = false, length = 100)
  String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  TransactionType type;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal amount;

  @Column(nullable = false, length = 3)
  String currency;

  @Column(nullable = false)
  UUID accountId;

  @Column(nullable = false, length = 500)
  String reason;

  @Column(nullable = false, updatable = false)
  Instant createdAt;
}
