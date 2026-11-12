package com.balance.app.savings;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/savings")
public class SavingsController {
  private final SavingsService service;

  public SavingsController(SavingsService s) {
    service = s;
  }

  @GetMapping
  public List<SavingsDto.View> list() {
    return service.list();
  }

  @GetMapping("/overview")
  public SavingsDto.Overview overview() {
    return service.overview();
  }

  @GetMapping("/{id}")
  public SavingsDto.View get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<SavingsDto.View> create(@Valid @RequestBody SavingsDto.Write body) {
    var g = service.create(body);
    return ResponseEntity.created(URI.create("/api/savings/" + g.id())).body(g);
  }

  @PutMapping("/{id}")
  public SavingsDto.View update(@PathVariable UUID id, @Valid @RequestBody SavingsDto.Update body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id, @RequestParam long version) {
    service.delete(id, version);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/allocate")
  public ResponseEntity<Void> allocate(
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody SavingsDto.Funding body) {
    service.allocate(id, body, key);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/release")
  public ResponseEntity<Void> release(
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody SavingsDto.Funding body) {
    service.release(id, body, key);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/reallocate")
  public ResponseEntity<Void> move(
      @RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody SavingsDto.Move body) {
    service.move(body, key);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/history")
  public SavingsDto.HistoryPage history(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return service.history(id, page, size);
  }

  @GetMapping("/{id}/allocations")
  public Map<UUID, java.math.BigDecimal> allocations(@PathVariable UUID id) {
    return service.allocations(id);
  }

  @GetMapping("/{id}/forecast")
  public SavingsDto.Forecast forecast(@PathVariable UUID id) {
    return service.get(id).forecast();
  }
}
