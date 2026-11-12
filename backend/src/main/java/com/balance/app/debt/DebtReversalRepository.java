package com.balance.app.debt;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebtReversalRepository extends JpaRepository<DebtReversal, UUID> {
  Optional<DebtReversal> findByPaymentId(UUID id);

  Optional<DebtReversal> findByRequestKey(UUID key);
}
