package com.balance.app.debt;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/debts")
public class DebtAutomaticCreationController {
 private final DebtAutomationService service;
 public DebtAutomaticCreationController(DebtAutomationService service){this.service=service;}
 @PostMapping("/monthly-auto")
 public ResponseEntity<DebtDto.View> create(@RequestHeader("Idempotency-Key")UUID key,@Valid @RequestBody DebtAutomationService.MonthlyAuto body){var d=service.createMonthly(body,key);return ResponseEntity.created(URI.create("/api/debts/"+d.id())).body(d);}
}
