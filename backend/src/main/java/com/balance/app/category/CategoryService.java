package com.balance.app.category;

import com.balance.app.service.*;
import com.balance.app.transaction.TransactionType;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {
  private final CategoryRepository categories;
  private final CategoryMapper mapper;
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;

  public CategoryService(CategoryRepository categories, CategoryMapper mapper, org.springframework.jdbc.core.JdbcTemplate jdbc) {
    this.categories = categories;
    this.mapper = mapper;
    this.jdbc = jdbc;
  }

  public void delete(UUID id) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145064)");
    jdbc.queryForList("select pg_advisory_xact_lock(729145065)");
    var category=categories.lock(id).orElseThrow(() -> DomainException.missing("Category"));
    var other=categories.findAll().stream().filter(c->c.internal && c.getType()==category.getType() && !c.getId().equals(id)).findFirst().orElse(null);
    if(other==null) {
      other=new Category("Без категории · "+UUID.randomUUID().toString().substring(0,8),category.getType());
      other.internal=true;categories.saveAndFlush(other);
    }
    UUID fallback=other.getId();
    // Keep monetary history intact while removing the category itself, including inactive categories.
    jdbc.update("update financial_transactions set category_id=?,version=version+1 where category_id=?",fallback,id);
    jdbc.update("update recurring_templates set category_id=?,version=version+1 where category_id=?",fallback,id);
    jdbc.update("update household_bill_items set category_id=? where category_id=?",fallback,id);
    jdbc.update("delete from budget_category_limits where category_id=?",id);
    categories.delete(category);categories.flush();
  }

  public CategoryDto.View create(CategoryDto.Create request) {
    if (request.type() != TransactionType.INCOME && request.type() != TransactionType.EXPENSE)
      throw DomainException.invalid("Category type must be INCOME or EXPENSE");
    return mapper.view(
        categories.saveAndFlush(new Category(Money.name(request.name()), request.type())));
  }

  @Transactional(readOnly = true)
  public List<CategoryDto.View> list() {
    return categories
        .findAll(org.springframework.data.domain.Sort.by("type", "name", "id"))
        .stream()
        .filter(c -> !c.internal)
        .map(mapper::view)
        .toList();
  }

  @Transactional(readOnly = true)
  public CategoryDto.View get(UUID id) {
    return mapper.view(
        categories.findById(id).orElseThrow(() -> DomainException.missing("Category")));
  }

  public CategoryDto.View update(UUID id, CategoryDto.Update request) {
    Category category = categories.lock(id).orElseThrow(() -> DomainException.missing("Category"));
    Money.version(category.getVersion(), request.version());
    if (request.active() == null) throw DomainException.invalid("Active is required");
    category.update(Money.name(request.name()), request.active());
    categories.flush();
    return mapper.view(category);
  }
}
