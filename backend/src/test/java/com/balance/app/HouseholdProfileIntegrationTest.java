package com.balance.app;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.balance.app.account.*;
import com.balance.app.budget.*;
import com.balance.app.calendar.*;
import com.balance.app.category.*;
import com.balance.app.service.DomainException;
import com.balance.app.transaction.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
    classes = BalanceApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "balance.local.username=finance-test",
      "balance.local.password=only-for-isolated-tests-12345",
      "balance.debts.scheduler-enabled=false",
      "balance.recurring.monthly-auto-enabled=false"
    })
@ActiveProfiles("local-finance")
class HouseholdProfileIntegrationTest {
  static final String USER = "finance-test", PASSWORD = "only-for-isolated-tests-12345";
  static final LocalDate DATE = LocalDate.of(2026, 11, 6);
  static final UUID FOOD = UUID.fromString("00000000-0000-0000-0001-000000000001");
  static final UUID SALARY = UUID.fromString("00000000-0000-0000-0002-000000000001");
  static final EmbeddedPostgres POSTGRES = startDatabase();

  static EmbeddedPostgres startDatabase() {
    try {
      Path working = Files.createDirectories(Path.of("target", "embedded-pg"));
      var pg =
          EmbeddedPostgres.builder()
              .setOverrideWorkingDirectory(working.toFile())
              .setDataDirectory(working.resolve("data-" + UUID.randomUUID()))
              .setServerConfig("listen_addresses", "127.0.0.1")
              .setLocaleConfig("locale", "C")
              .setCleanDataDirectory(true)
              .start();
      try (var c = pg.getPostgresDatabase().getConnection();
          var statement = c.createStatement()) {
        statement.execute("CREATE ROLE balance_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE");
        statement.execute("CREATE DATABASE balance_test OWNER balance_test");
      }
      return pg;
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) {
    properties.add(
        "spring.datasource.url", () -> POSTGRES.getJdbcUrl("balance_test", "balance_test"));
    properties.add("spring.datasource.username", () -> "balance_test");
    properties.add("spring.datasource.password", () -> "");
  }

  @Autowired AccountService accounts;
  @Autowired WebApplicationContext context;
  MockMvc mvc;
  @BeforeEach void setup(){mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();}
  @Autowired HouseholdProfileService householdProfile;

  @Test void householdNamesRequireAuthenticationCsrfAndPreserveMoney() throws Exception {
    mvc.perform(get("/api/money/household-profile")).andExpect(status().isUnauthorized());
    var old = householdProfile.get();
    var before = accounts.balances();
    String body = "{\"firstName\":\"Sam\",\"partnerName\":\"Kim\",\"version\":" + old.version() + "}";
    mvc.perform(put("/api/money/household-profile").with(httpBasic(USER,PASSWORD))
        .contentType("application/json").content(body)).andExpect(status().isForbidden());
    mvc.perform(put("/api/money/household-profile").with(httpBasic(USER,PASSWORD)).with(csrf())
        .contentType("application/json").content(body)).andExpect(status().isOk())
        .andExpect(jsonPath("$.firstName").value("Sam"))
        .andExpect(jsonPath("$.partnerName").value("Kim"));
    mvc.perform(put("/api/money/household-profile").with(httpBasic(USER,PASSWORD)).with(csrf())
        .contentType("application/json").content(body)).andExpect(status().isConflict());
    assertEquals(before, accounts.balances());
    var saved = householdProfile.get();
    assertEquals("Kim", saved.partnerName());
    var reset = householdProfile.save(new HouseholdProfileService.Save(" ",null,saved.version()));
    assertNull(reset.firstName()); assertNull(reset.partnerName());
  }

  @Test void householdNamesValidateLengthAndControlCharacters() throws Exception {
    var old = householdProfile.get();
    String prefix = "{\"partnerName\":null,\"version\":"+old.version()+",\"firstName\":";
    for (String value : List.of("\""+"a".repeat(61)+"\"", "\"bad\\u0001name\"")) {
      mvc.perform(put("/api/money/household-profile").with(httpBasic(USER,PASSWORD)).with(csrf())
          .contentType("application/json").content(prefix+value+"}"))
          .andExpect(status().isBadRequest());
    }
    assertEquals(old,householdProfile.get());
  }
}
