package com.balance.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class BalanceApplication {
  public static void main(String[] args) {
    SpringApplication.run(BalanceApplication.class, args);
  }
}
