package com.balance.app.savings;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsRepository extends JpaRepository<SavingsGoal, UUID> {}
