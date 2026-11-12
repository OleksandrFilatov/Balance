package com.balance.app.budget;

import com.balance.app.transaction.FinanceScope;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {
  private final BudgetService service;

  public BudgetController(BudgetService s) {
    service = s;
  }

  @GetMapping
  public BudgetDto.Report report(
      @RequestParam String month,
      @RequestParam FinanceScope scope,
      @RequestParam(required = false) UUID categoryId) {
    return service.report(month, scope, categoryId);
  }

  @GetMapping("/history")
  public List<BudgetDto.View> history(@RequestParam FinanceScope scope) {
    return service.history(scope);
  }

  @PostMapping
  public ResponseEntity<BudgetDto.View> create(@Valid @RequestBody BudgetDto.Create d) {
    var b = service.create(d);
    return ResponseEntity.created(
            URI.create("/api/budgets?month=" + b.month() + "&scope=" + b.scope()))
        .body(b);
  }

  @PutMapping("/{id}")
  public BudgetDto.View update(@PathVariable UUID id, @Valid @RequestBody BudgetDto.Update d) {
    return service.update(id, d);
  }

  @PostMapping("/copy")
  public ResponseEntity<BudgetDto.View> copy(@Valid @RequestBody BudgetDto.Copy d) {
    var b = service.copy(d);
    return ResponseEntity.created(
            URI.create("/api/budgets?month=" + b.month() + "&scope=" + b.scope()))
        .body(b);
  }
}
