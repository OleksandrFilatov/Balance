package com.balance.app.category;

import com.balance.app.transaction.TransactionType;
import jakarta.validation.constraints.*;
import java.util.UUID;

public final class CategoryDto {
  private CategoryDto() {}

  public record Create(@NotBlank @Size(max = 100) String name, @NotNull TransactionType type) {}

  public record Update(
      @NotBlank @Size(max = 100) String name,
      @NotNull Boolean active,
      @NotNull @PositiveOrZero Long version) {}

  public record View(UUID id, String name, TransactionType type, boolean active, long version) {}
}
