package com.balance.app.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(auth ->
            auth.requestMatchers(
                    HttpMethod.GET,
                    "/api/health", "/", "/index.html", "/assets/**", "/favicon.ico",
                    "/money", "/household", "/debts", "/debts/*", "/savings", "/savings/*",
                    "/statistics", "/settings", "/accounts", "/transactions", "/recurring", "/budgets", "/calendar", "/categories", "/personal-expenses", "/batrachka", "/work-calendar")
                .permitAll()
                .anyRequest()
                .denyAll())
        .exceptionHandling(errors ->
            errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .build();
  }
}
