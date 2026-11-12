package com.balance.app.debt;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/debts/{id}")
public class DebtAutomationController {
 private final DebtAutomationService service;
 public DebtAutomationController(DebtAutomationService service){this.service=service;}
 @GetMapping("/plan") public DebtAutomationService.Plan plan(@PathVariable UUID id,@RequestParam(required=false)Integer offset){return service.plan(id,offset);}
 @PutMapping("/schedule") public DebtAutomationService.Plan schedule(@PathVariable UUID id,@Valid @RequestBody DebtAutomationService.Schedule body){return service.reschedule(id,body);}
 @PutMapping("/automation") public DebtAutomationService.Plan save(@PathVariable UUID id,@Valid @RequestBody DebtAutomationService.Settings body){return service.configure(id,body);}
}
