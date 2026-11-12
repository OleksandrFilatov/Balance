package com.balance.app.category;

import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {
  public CategoryDto.View view(Category c) {
    return new CategoryDto.View(c.getId(), c.getName(), c.getType(), c.isActive(), c.getVersion());
  }
}
