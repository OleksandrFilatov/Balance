package com.balance.app.recurring;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "recurring_executions")
public class RecurringExecution {
  @Id UUID id;

  @Column(nullable = false)
  UUID templateId;

  @Column(nullable = false)
  LocalDate occurrenceDate;

  @Column(nullable = false, unique = true)
  UUID transactionId;

  @Column(nullable = false, length = 20)
  String mode;

  @Column(nullable = false)
  Instant createdAt;

  Instant cancelledAt;

  @Column(length=500)
  String cancellationReason;

  protected RecurringExecution() {}
}
