package com.balance.app.account;

import com.balance.app.budget.*;
import com.balance.app.service.*;
import com.balance.app.transaction.FinanceScope;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Simple presentation of the existing personal monthly budget, never a bank movement. */
@Service
@Transactional
public class PersonalAllowanceService {
 private final BudgetService budgets;
 public PersonalAllowanceService(BudgetService budgets){this.budgets=budgets;}
 public record Save(@NotNull @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal amount,@NotNull @PositiveOrZero Long version){}
 public record View(String month,boolean configured,BigDecimal amount,BigDecimal spent,BigDecimal remaining,BigDecimal percent,boolean exceeded,long version){}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View get(String month){var r=budgets.report(month,FinanceScope.PERSONAL,null);return new View(month,r.budget()!=null,r.budget()==null?null:r.budget().plan().plannedExpense(),r.actualExpense(),r.remaining(),r.usagePercent(),r.exceeded(),r.budget()==null?0:r.budget().version());}
 public View save(String month,Save d){
  var r=budgets.report(month,FinanceScope.PERSONAL,null);long version=r.budget()==null?0:r.budget().version();Money.version(version,d.version());
  if(r.budget()==null)budgets.create(new BudgetDto.Create(month,FinanceScope.PERSONAL,new BudgetDto.Plan(BigDecimal.ZERO,d.amount(),List.of())));
  else {var p=r.budget().plan();budgets.update(r.budget().id(),new BudgetDto.Update(d.version(),new BudgetDto.Plan(p.plannedIncome(),d.amount(),p.limits())));}
  return get(month);
 }
}
