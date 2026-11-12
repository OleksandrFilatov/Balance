package com.balance.app.savings;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "savings_entries")
public class SavingsEntry {
  @Id UUID id;

  @Column(nullable = false)
  UUID goalId;

  UUID accountId;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal amount;

  @Column(nullable = false, length = 30)
  String action;

  @Column(nullable = false, length = 2000)
  String note;

  @Column(nullable = false)
  Instant createdAt;

  UUID commandId;

  protected SavingsEntry() {}
}
