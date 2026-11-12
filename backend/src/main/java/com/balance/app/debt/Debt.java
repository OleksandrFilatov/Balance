package com.balance.app.debt;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "debts")
public class Debt {
  boolean deleted;
  @Id UUID id;

  @Column(nullable = false, length = 100)
  String name;

  @Column(nullable = false, length = 100)
  String creditor;

  @Column(nullable = false, length = 2000)
  String description;

  @Column(nullable = false, length = 20)
  String kind;

  @Column(nullable = false, precision = 19, scale = 2, updatable = false)
  BigDecimal originalAmount;

  @Column(nullable = false, precision = 19, scale = 2, updatable = false)
  BigDecimal openingRemaining;

  @Column(nullable = false, length = 3, updatable = false)
  String currency;

  @Column(precision = 9, scale = 4)
  BigDecimal annualRate;

  @Column(precision = 19, scale = 2)
  BigDecimal monthlyPayment;

  LocalDate nextPayment;

  @Column(nullable = false, length = 20)
  String status;

  @Column(nullable = false, updatable = false)
  Instant createdAt;

  @Column(nullable = false)
  Instant updatedAt;

  @Column(nullable = false, updatable = false)
  UUID createKey;

  @Column(nullable = false, updatable = false, columnDefinition = "text")
  String createFingerprint;

  @Column(nullable = false, updatable = false, length = 20)
  String origin;

  @Version Long version;

  protected Debt() {}
}
