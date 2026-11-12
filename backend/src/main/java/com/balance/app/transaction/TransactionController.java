package com.balance.app.transaction;

import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/transactions")
public class TransactionController {
  private final TransactionService service;

  public TransactionController(TransactionService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<TransactionDto.View> create(
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody TransactionDto.Write request) {
    var result = service.create(key, request);
    return ResponseEntity.status(result.replay() ? 200 : 201)
        .location(URI.create("/api/transactions/" + result.transaction().id()))
        .body(result.transaction());
  }

  @GetMapping("/{id}")
  public TransactionDto.View get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PutMapping("/{id}")
  public TransactionDto.View update(
      @PathVariable UUID id, @Valid @RequestBody TransactionDto.Update request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @RequestParam @PositiveOrZero long version) {
    service.delete(id, version);
    return ResponseEntity.noContent().build();
  }

  @GetMapping
  public TransactionDto.Page list(
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) UUID accountId,
      @RequestParam(required = false) FinanceScope scope,
      @RequestParam(required = false) TransactionType type,
      @RequestParam(required = false) TransactionStatus status,
      @RequestParam(defaultValue = "false") boolean excludeReversed,
      @RequestParam(defaultValue = "false") boolean excludeAdjustments,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return service.list(
        new TransactionDto.Filter(from, to, categoryId, accountId, scope, type, status,excludeReversed,excludeAdjustments),
        page,
        size);
  }
}
