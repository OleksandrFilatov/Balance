package com.balance.app.savings;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "savings_goals")
public class SavingsGoal {
  @Id UUID id;

  @Column(nullable = false, length = 100)
  String name;

  @Column(nullable = false, length = 2000)
  String description;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal target;

  @Column(nullable = false, length = 3)
  String currency;

  LocalDate deadline;

  @Column(nullable = false, precision = 19, scale = 2)
  BigDecimal monthlyPlan;

  @Column(nullable = false, length = 20)
  String status;

  @Column(nullable = false)
  Instant createdAt;

  @Column(nullable = false)
  boolean deleted;

  @Version Long version;

  protected SavingsGoal() {}
}
