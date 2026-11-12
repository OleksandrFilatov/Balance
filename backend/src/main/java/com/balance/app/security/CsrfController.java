package com.balance.app.security;

import org.springframework.context.annotation.Profile;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local-finance")
public class CsrfController {
  @GetMapping("/api/csrf")
  public Token token(CsrfToken token) {
    return new Token(token.getHeaderName(), token.getToken());
  }

  public record Token(String headerName, String token) {}
}
