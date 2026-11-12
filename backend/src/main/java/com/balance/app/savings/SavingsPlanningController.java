package com.balance.app.savings;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/savings/calculator")
public class SavingsPlanningController {
  private final SavingsPlanningService service;
  public SavingsPlanningController(SavingsPlanningService service) { this.service=service; }
  @PostMapping
  public SavingsPlanningService.Result calculate(@Valid @RequestBody SavingsPlanningService.Input input) {
    return service.calculate(input);
  }
}
