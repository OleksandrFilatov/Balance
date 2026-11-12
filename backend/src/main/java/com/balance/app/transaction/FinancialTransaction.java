package com.balance.app.transaction;

import com.balance.app.account.Account;
import com.balance.app.category.Category;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "financial_transactions")
public class FinancialTransaction {
  @Id private UUID id;
  private UUID debtId;
  private UUID recurringId;
  private UUID householdPaymentId;
  public UUID getHouseholdPaymentId(){return householdPaymentId;}
  public void linkHouseholdPayment(UUID id){householdPaymentId=id;}

  public UUID getRecurringId() {
    return recurringId;
  }

  public void linkRecurring(UUID id) {
    recurringId = id;
  }

  private UUID reversalOf;

  public void reverse(UUID source) {
    reversalOf = source;
  }

  public UUID getDebtId() {
    return debtId;
  }

  public void linkDebt(UUID id) {
    debtId = id;
  }

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TransactionType type;

  @Column(nullable = false, precision = 19, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 3)
  private String currency;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "debit_account_id")
  private Account debitAccount;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "credit_account_id")
  private Account creditAccount;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id")
  private Category category;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private FinanceScope scope;

  @Column(nullable = false)
  private LocalDate operationDate;

  @Column(nullable = false, length = 2000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TransactionStatus status;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  @Column(nullable = false)
  private boolean deleted;

  @Column(nullable = false, unique = true, updatable = false)
  private UUID createKey;

  @Column(nullable = false, length = 64, updatable = false)
  private String createFingerprint;

  @Version private Long version;

  protected FinancialTransaction() {}

  public FinancialTransaction(UUID createKey, String fingerprint) {
    this.id = UUID.randomUUID();
    this.createKey = createKey;
    this.createFingerprint = fingerprint;
    this.createdAt = Instant.now();
    this.updatedAt = createdAt;
  }

  public void apply(TransactionDto.Write data, Account debit, Account credit, Category category) {
    this.type = data.type();
    this.amount = data.amount();
    this.currency = data.currency();
    this.debitAccount = debit;
    this.creditAccount = credit;
    this.category = category;
    this.scope = data.scope();
    this.operationDate = data.operationDate();
    this.description = data.description();
    this.status = data.status();
    this.updatedAt = Instant.now();
  }

  public void delete() {
    this.deleted = true;
    this.updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public TransactionType getType() {
    return type;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public String getCurrency() {
    return currency;
  }

  public Account getDebitAccount() {
    return debitAccount;
  }

  public Account getCreditAccount() {
    return creditAccount;
  }

  public Category getCategory() {
    return category;
  }

  public FinanceScope getScope() {
    return scope;
  }

  public LocalDate getOperationDate() {
    return operationDate;
  }

  public String getDescription() {
    return description;
  }

  public TransactionStatus getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public boolean isDeleted() {
    return deleted;
  }

  public String getCreateFingerprint() {
    return createFingerprint;
  }

  public Long getVersion() {
    return version;
  }
}
