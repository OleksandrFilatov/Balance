package com.balance.app.debt;

import jakarta.validation.Valid;
import java.net.URI;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/debts")
public class DebtController {
  private final DebtService service;

  public DebtController(DebtService s) {
    service = s;
  }

  @GetMapping
  public List<DebtDto.View> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public DebtDto.View get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<DebtDto.View> create(
      @RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody DebtDto.Create r) {
    var d = service.create(r, key);
    return ResponseEntity.created(URI.create("/api/debts/" + d.id())).body(d);
  }

  @PutMapping("/{id}")
  public DebtDto.View update(@PathVariable UUID id, @Valid @RequestBody DebtDto.Update r) {
    return service.update(id, r);
  }

  @PostMapping("/monthly")
  public ResponseEntity<DebtDto.View> monthly(
      @RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody DebtDto.Monthly body) {
    var d = service.createMonthly(body, key);
    return ResponseEntity.created(URI.create("/api/debts/" + d.id())).body(d);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/payments")
  public ResponseEntity<DebtDto.Payment> pay(
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody DebtDto.Pay r) {
    var p = service.pay(id, r, key);
    return ResponseEntity.created(URI.create("/api/debts/" + id + "/payments")).body(p);
  }

  @GetMapping("/{id}/payments")
  public DebtDto.History history(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return service.history(id, page, size);
  }

  @PostMapping("/{id}/payments/{paymentId}/reverse")
  public DebtDto.Payment reverse(
      @PathVariable UUID id,
      @PathVariable UUID paymentId,
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody DebtDto.Reverse body) {
    return service.reverse(id, paymentId, body, key);
  }

  @GetMapping("/{id}/forecast")
  public DebtDto.Forecast forecast(@PathVariable UUID id) {
    return service.forecast(id);
  }

  @GetMapping("/overview")
  public DebtDto.Overview overview(
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    return service.overview(
        from == null ? today.withDayOfMonth(1) : from,
        to == null ? today.withDayOfMonth(today.lengthOfMonth()) : to);
  }
}
