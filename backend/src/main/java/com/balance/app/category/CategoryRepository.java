package com.balance.app.category;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Category c where c.id = :id")
  Optional<Category> lock(@Param("id") UUID id);
}
