package com.balance.app.recurring;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RecurringRepository extends JpaRepository<RecurringTemplate, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from RecurringTemplate r where r.id=:id")
  Optional<RecurringTemplate> lock(@Param("id") UUID id);

  @Query(
      "select r.id from RecurringTemplate r where r.deleted=false and r.status='ACTIVE' and r.automatic=true and"
          + " r.nextDate<=:today order by r.nextDate,r.id")
  List<UUID> due(
      @Param("today") java.time.LocalDate today, org.springframework.data.domain.Pageable limit);

  @Query(value="select id from recurring_templates where not deleted and status='ACTIVE' and automatic and frequency='MONTHLY' and next_date<=:today and not(type='EXPENSE' and scope='HOUSEHOLD' and currency='EUR') order by case when type='INCOME' then 0 else 1 end,next_date,id",nativeQuery=true)
  List<UUID> monthlyDue(@Param("today") java.time.LocalDate today,org.springframework.data.domain.Pageable limit);
}
