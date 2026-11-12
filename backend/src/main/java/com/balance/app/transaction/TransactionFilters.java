package com.balance.app.transaction;

import com.balance.app.service.DomainException;
import jakarta.persistence.criteria.Predicate;
import java.util.*;
import org.springframework.data.jpa.domain.Specification;

public final class TransactionFilters {
  private TransactionFilters() {}

  public static void dates(java.time.LocalDate from, java.time.LocalDate to) {
    for (java.time.LocalDate date : new java.time.LocalDate[] {from, to}) {
      if (date != null && (date.getYear() < 1 || date.getYear() > 9999))
        throw DomainException.invalid("Date year must be between 1 and 9999");
    }
    if (from != null && to != null && from.isAfter(to))
      throw DomainException.invalid("from must not be after to");
  }

  public static Specification<FinancialTransaction> matching(TransactionDto.Filter f) {
    dates(f.from(), f.to());
    return (root, query, cb) -> {
      List<Predicate> p = new ArrayList<>();
      p.add(cb.isFalse(root.get("deleted")));
      if(Boolean.TRUE.equals(f.excludeAdjustments()))p.add(cb.notEqual(root.get("type"),TransactionType.OPENING_ADJUSTMENT));
      if(Boolean.TRUE.equals(f.excludeReversed())){
        p.add(cb.isNull(root.get("reversalOf")));
        var reversal=query.subquery(UUID.class);var other=reversal.from(FinancialTransaction.class);
        reversal.select(other.get("id")).where(cb.equal(other.get("reversalOf"),root.get("id")),cb.isFalse(other.get("deleted")));
        p.add(cb.not(cb.exists(reversal)));
      }
      if (f.from() != null) p.add(cb.greaterThanOrEqualTo(root.get("operationDate"), f.from()));
      if (f.to() != null) p.add(cb.lessThanOrEqualTo(root.get("operationDate"), f.to()));
      if (f.categoryId() != null) p.add(cb.equal(root.get("category").get("id"), f.categoryId()));
      if (f.accountId() != null)
        p.add(
            cb.or(
                cb.equal(root.get("debitAccount").get("id"), f.accountId()),
                cb.equal(root.get("creditAccount").get("id"), f.accountId())));
      if (f.scope() != null) p.add(cb.equal(root.get("scope"), f.scope()));
      if (f.type() != null) p.add(cb.equal(root.get("type"), f.type()));
      if (f.status() != null) p.add(cb.equal(root.get("status"), f.status()));
      return cb.and(p.toArray(Predicate[]::new));
    };
  }
}
