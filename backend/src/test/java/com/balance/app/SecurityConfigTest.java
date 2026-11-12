package com.balance.app;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
    classes = SecurityConfigTest.SecurityTestApplication.class,
    properties = {
      "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
    })
class SecurityConfigTest {
  @org.springframework.context.annotation.Configuration
  @org.springframework.boot.autoconfigure.EnableAutoConfiguration(
      exclude =
          org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration.class)
  @org.springframework.context.annotation.Import({
    com.balance.app.security.SecurityConfig.class,
    com.balance.app.config.HealthController.class,
    com.balance.app.config.FrontendPageController.class
  })
  static class SecurityTestApplication {}

  @Autowired WebApplicationContext context;
  MockMvc mvc;

  @BeforeEach
  void setUp() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @Test
  void healthIsAvailable() throws Exception {
    mvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
  }

  @Test
  void otherApiRequestsAreDenied() throws Exception {
    mvc.perform(get("/api/private")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/transactions")).andExpect(status().isUnauthorized());
  }

  @Test
  void stateChangingRequestWithoutCsrfIsRejected() throws Exception {
    mvc.perform(post("/private")).andExpect(status().isForbidden());
  }

  @Test
  void healthDoesNotAllowArbitraryOrigins() throws Exception {
    mvc.perform(get("/api/health").header("Origin", "https://example.com"))
        .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
  }

  @Test
  void browserRoutesForwardToTheBundledFrontend() throws Exception {
    for (String path : new String[] {
      "/money", "/household", "/debts", "/debts/00000000-0000-0000-0000-000000000001",
      "/savings", "/savings/00000000-0000-0000-0000-000000000001", "/statistics", "/settings",
      "/accounts", "/transactions", "/recurring", "/budgets", "/calendar", "/personal-expenses", "/batrachka", "/work-calendar"
    }) {
      mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }
  }

  @Test
  void frontendRoutingDoesNotExposeUnknownPathsOrApi() throws Exception {
    for (String path : new String[] {"/not-a-page", "/api/private", "/money/api/accounts"}) {
      mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }
  }

  @Test
  void frontendGetRoutesDoNotPermitStateChangingRequests() throws Exception {
    mvc.perform(post("/money")).andExpect(status().isForbidden());
  }
}
