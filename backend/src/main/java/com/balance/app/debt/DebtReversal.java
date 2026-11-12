package com.balance.app.debt;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "debt_payment_reversals")
public class DebtReversal {
  @Id UUID id;

  @Column(nullable = false, unique = true)
  UUID paymentId;

  @Column(nullable = false)
  LocalDate operationDate;

  @Column(nullable = false, length = 500)
  String reason;

  @Column(nullable = false)
  Instant createdAt;

  @Column(nullable = false, unique = true)
  UUID requestKey;

  @Column(nullable = false, columnDefinition = "text")
  String fingerprint;

  protected DebtReversal() {}
}
