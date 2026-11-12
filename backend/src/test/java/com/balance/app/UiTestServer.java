package com.balance.app;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.*;
import java.util.*;
import org.springframework.boot.SpringApplication;

/** Isolated, empty PostgreSQL-backed server for browser integration tests. Never uses DB_URL. */
public final class UiTestServer {
  public static void main(String[] args) throws Exception {
    if (!Boolean.getBoolean("balance.ui-test.enabled"))
      throw new IllegalStateException(
          "Set -Dbalance.ui-test.enabled=true only for isolated browser tests");
    Path directory = Files.createDirectories(Path.of("target", "ui-postgres"));
    try (var postgres =
        EmbeddedPostgres.builder()
            .setOverrideWorkingDirectory(directory.toFile())
            .setDataDirectory(directory.resolve("data-" + UUID.randomUUID()))
            .setServerConfig("listen_addresses", "127.0.0.1")
            .setLocaleConfig("locale", "C")
            .start()) {
      try (var connection = postgres.getPostgresDatabase().getConnection();
          var sql = connection.createStatement()) {
        sql.execute("CREATE ROLE balance_ui LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE");
        sql.execute("CREATE DATABASE balance_ui OWNER balance_ui");
      }
      SpringApplication app = new SpringApplication(BalanceApplication.class);
      app.addPrimarySources(List.of(TestMarkerConfiguration.class));
      app.setAdditionalProfiles("local-finance");
      app.run(
          "--spring.datasource.url=" + postgres.getJdbcUrl("balance_ui", "balance_ui"),
          "--spring.datasource.username=balance_ui",
          "--spring.datasource.password=",
          "--balance.local.username=ui-test",
          "--balance.local.password=isolated-browser-tests-only-12345",
          "--balance.debts.scheduler-enabled="+System.getProperty("balance.ui-test.debt-auto.enabled","false"),
          "--balance.recurring.monthly-auto-enabled=false",
          "--server.port=" + System.getProperty("balance.ui-test.port", "8080"));
      new java.util.concurrent.CountDownLatch(1).await();
    }
  }

  @org.springframework.context.annotation.Configuration(proxyBeanMethods = false)
  @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
      name = "balance.ui-test.enabled",
      havingValue = "true")
  static class TestMarkerConfiguration {
    @org.springframework.context.annotation.Bean
    org.springframework.boot.web.servlet.FilterRegistrationBean<jakarta.servlet.Filter>
        isolatedDatabaseMarker() {
      var registration =
          new org.springframework.boot.web.servlet.FilterRegistrationBean<jakarta.servlet.Filter>(
              (request, response, chain) -> {
                ((jakarta.servlet.http.HttpServletResponse) response)
                    .setHeader("X-Balance-Test-Database", "isolated");
                chain.doFilter(request, response);
              });
      registration.setOrder(org.springframework.core.Ordered.HIGHEST_PRECEDENCE);
      return registration;
    }
  }
}
