package com.balance.app.recurring;

import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CancellationRepository extends JpaRepository<RecurringCancellation, UUID> {
  Optional<RecurringCancellation> findByTemplateIdAndOccurrenceDate(UUID id, LocalDate date);

  @Query("select max(c.occurrenceDate) from RecurringCancellation c where c.templateId=:id")
  LocalDate last(@Param("id") UUID id);
}
