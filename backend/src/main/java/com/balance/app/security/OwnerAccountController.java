package com.balance.app.security;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@org.springframework.context.annotation.Profile("local-finance")
@RequestMapping("/api/owner")
public class OwnerAccountController {
 private final OwnerAccountService service;
 public OwnerAccountController(OwnerAccountService service){this.service=service;}
 @GetMapping public OwnerAccountService.Status status(){return service.status();}
 @PostMapping public ResponseEntity<OwnerAccountService.Status> register(@Valid @RequestBody OwnerAccountService.Registration body){service.register(body);return ResponseEntity.status(201).body(service.status());}
}
