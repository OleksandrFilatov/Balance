package com.balance.app.security;

import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.*;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import java.util.Map;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Explicit opt-in local API access. The existing default security chain is unchanged. This profile
 * is for a single local owner, not multi-user production authorization.
 */
@Configuration
@Profile("local-finance")
public class LocalFinanceSecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new DelegatingPasswordEncoder("pbkdf2",Map.of("pbkdf2",Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8(),"bcrypt",new BCryptPasswordEncoder()));
  }

  @Bean
  UserDetailsService financeUser(Environment env, JdbcTemplate jdbc) {
    String username = env.getRequiredProperty("balance.local.username");
    String password = env.getRequiredProperty("balance.local.password");
    if (username.isBlank()
        || password.length() < 16
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalStateException(
          "Local finance credentials require a username, at least 16 password characters and at"
              + " most 72 UTF-8 bytes");
    String legacyHash="{bcrypt}"+new BCryptPasswordEncoder().encode(password);
    return requested -> {
      var rows=jdbc.queryForList("select username,password_hash from owner_account where id=1");
      if(!rows.isEmpty()) {
        var row=rows.getFirst();
        if(!requested.equals(row.get("username")))throw new UsernameNotFoundException("Unknown owner");
        return User.withUsername(requested).password((String)row.get("password_hash")).roles("FINANCE").build();
      }
      if(!requested.equals(username))throw new UsernameNotFoundException("Unknown owner");
      return User.withUsername(username).password(legacyHash).roles("FINANCE").build();
    };
  }

  @Bean
  @Order(1)
  SecurityFilterChain financeSecurity(HttpSecurity http) throws Exception {
    return http.securityMatcher(
            "/api/work-calendar/**",
            "/api/accounts",
            "/api/owner",
            "/api/accounts/**",
            "/api/categories",
            "/api/categories/**",
            "/api/transactions",
            "/api/transactions/**",
            "/api/balances",
            "/api/summary",
            "/api/summary/**",
            "/api/csrf",
            "/api/savings",
            "/api/savings/**",
            "/api/debts",
            "/api/debts/**",
            "/api/recurring",
            "/api/recurring/**",
            "/api/budgets",
            "/api/budgets/**",
            "/api/calendar",
            "/api/calendar/**",
            "/api/money",
            "/api/money/**")
        .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("FINANCE"))
        .httpBasic(Customizer.withDefaults())
        .build();
  }
}
