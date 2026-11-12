package com.balance.app.security;

import com.balance.app.service.DomainException;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@org.springframework.context.annotation.Profile("local-finance")
public class OwnerAccountService {
  private final JdbcTemplate jdbc;
  private final PasswordEncoder encoder;
  public OwnerAccountService(JdbcTemplate jdbc,PasswordEncoder encoder) {this.jdbc=jdbc;this.encoder=encoder;}
  public record Registration(@NotBlank @Size(max=100) String username,@NotBlank @Size(max=1024) String password) {}
  public record Status(boolean registered) {}
  public Status status() { return new Status(jdbc.queryForObject("select count(*) from owner_account",Long.class)>0); }
  @Transactional
  public void register(Registration registration) {
    jdbc.queryForList("select pg_advisory_xact_lock(729145066)");
    if(status().registered())throw DomainException.conflict("Аккаунт владельца уже создан.");
    jdbc.update("insert into owner_account(id,username,password_hash) values(1,?,?)",registration.username().strip(),encoder.encode(registration.password()));
  }
}
