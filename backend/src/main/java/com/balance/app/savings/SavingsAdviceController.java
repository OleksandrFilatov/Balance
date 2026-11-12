package com.balance.app.savings;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/savings/advice")
public class SavingsAdviceController {
  private final SavingsAdviceService service;
  public SavingsAdviceController(SavingsAdviceService service) { this.service = service; }

  @GetMapping
  public SavingsAdviceService.Advice overview() {
    return service.advise(new SavingsAdviceService.Input(null, null, false));
  }

  @PostMapping
  public SavingsAdviceService.Advice advise(@Valid @RequestBody SavingsAdviceService.Input input) {
    return service.advise(input);
  }
}
