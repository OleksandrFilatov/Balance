package com.balance.app.recurring;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ExecutionRepository extends JpaRepository<RecurringExecution, UUID> {
  Optional<RecurringExecution> findByTemplateIdAndOccurrenceDate(UUID id, LocalDate date);

  @Query("select max(e.occurrenceDate) from RecurringExecution e where e.templateId=:id")
  LocalDate last(@Param("id") UUID id);

  org.springframework.data.domain.Page<RecurringExecution> findByTemplateId(
      UUID id, org.springframework.data.domain.Pageable page);
}
