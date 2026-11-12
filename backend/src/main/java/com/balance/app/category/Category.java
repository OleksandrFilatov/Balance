package com.balance.app.category;

import com.balance.app.transaction.TransactionType;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {
  boolean internal;
  @Id private UUID id;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20, updatable = false)
  private TransactionType type;

  @Column(nullable = false)
  private boolean active;

  @Version private Long version;

  protected Category() {}

  public Category(String name, TransactionType type) {
    this.id = UUID.randomUUID();
    this.name = name;
    this.type = type;
    this.active = true;
  }

  public void update(String name, boolean active) {
    this.name = name;
    this.active = active;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public TransactionType getType() {
    return type;
  }

  public boolean isActive() {
    return active;
  }

  public Long getVersion() {
    return version;
  }
}
