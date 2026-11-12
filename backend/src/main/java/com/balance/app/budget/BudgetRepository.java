package com.balance.app.budget;

import com.balance.app.transaction.FinanceScope;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {
  Optional<Budget> findByMonthAndScope(LocalDate month, FinanceScope scope);

  List<Budget> findByScopeOrderByMonthDesc(FinanceScope scope);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Budget b where b.id=:id")
  Optional<Budget> lock(@Param("id") UUID id);
}
