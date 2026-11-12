package com.balance.app.account;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
  private final AccountService service;

  public AccountController(AccountService service) {
    this.service = service;
  }

  @GetMapping
  public List<AccountDto.View> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public AccountDto.View get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<AccountDto.View> create(@Valid @RequestBody AccountDto.Create request) {
    var result = service.create(request);
    return ResponseEntity.created(URI.create("/api/accounts/" + result.id())).body(result);
  }

  @PutMapping("/{id}")
  public AccountDto.View update(
      @PathVariable UUID id, @Valid @RequestBody AccountDto.Update request) {
    return service.update(id, request);
  }

  @GetMapping("/{id}/balance")
  public AccountDto.Balance balance(@PathVariable UUID id) {
    return service.balance(id);
  }
}
