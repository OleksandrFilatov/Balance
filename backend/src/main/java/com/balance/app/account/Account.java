package com.balance.app.account;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class Account {
  @Id private UUID id;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private AccountType type;

  @Column(nullable = false, length = 3, updatable = false)
  private String currency;

  @Column(nullable = false, precision = 19, scale = 2, updatable = false)
  private BigDecimal initialBalance;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private boolean active;

  @Version private Long version;

  protected Account() {}

  public Account(String name, AccountType type, String currency, BigDecimal initialBalance) {
    this.id = UUID.randomUUID();
    this.name = name;
    this.type = type;
    this.currency = currency;
    this.initialBalance = initialBalance;
    this.createdAt = Instant.now();
    this.active = true;
  }

  public void update(String name, AccountType type, boolean active) {
    this.name = name;
    this.type = type;
    this.active = active;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public AccountType getType() {
    return type;
  }

  public String getCurrency() {
    return currency;
  }

  public BigDecimal getInitialBalance() {
    return initialBalance;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public boolean isActive() {
    return active;
  }

  public Long getVersion() {
    return version;
  }
}
