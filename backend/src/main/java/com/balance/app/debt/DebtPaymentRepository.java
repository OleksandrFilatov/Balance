package com.balance.app.debt;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DebtPaymentRepository extends JpaRepository<DebtPayment, UUID> {
  Optional<DebtPayment> findByRequestKey(UUID key);

  @Query(
      value =
          "select coalesce(sum(p.principal),0) from debt_payments p where p.debt_id=:id and not"
              + " exists(select 1 from debt_payment_reversals r where r.payment_id=p.id)",
      nativeQuery = true)
  BigDecimal paid(@Param("id") UUID id);

  org.springframework.data.domain.Page<DebtPayment> findByDebtId(
      UUID id, org.springframework.data.domain.Pageable page);
}
