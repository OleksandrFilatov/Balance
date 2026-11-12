package com.balance.app.debt;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DebtRepository extends JpaRepository<Debt, UUID> {
  Optional<Debt> findByCreateKey(UUID key);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select d from Debt d where d.id=:id")
  Optional<Debt> lock(@Param("id") UUID id);
}
