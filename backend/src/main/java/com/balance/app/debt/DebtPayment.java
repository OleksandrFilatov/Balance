package com.balance.app.debt;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "debt_payments")
public class DebtPayment {
  LocalDate scheduledDate;
  @Id UUID id;

  @Column(nullable = false)
  UUID debtId;

  @Column(nullable = false)
  UUID accountId;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal principal;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal interest;

  @Column(nullable = false)
  LocalDate operationDate;

  @Column(nullable = false, length = 2000)
  String description;

  @Column(nullable = false)
  Instant createdAt;

  @Column(nullable = false, unique = true)
  UUID requestKey;

  @Column(nullable = false, columnDefinition = "text")
  String fingerprint;

  UUID principalTransactionId;
  UUID interestTransactionId;

  protected DebtPayment() {}
}
