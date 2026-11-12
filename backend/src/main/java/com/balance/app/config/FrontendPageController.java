package com.balance.app.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Serves the bundled React entry point for known browser routes, including page reloads. */
@Controller
public class FrontendPageController {
  @GetMapping({
    "/batrachka", "/work-calendar", "/money", "/household", "/debts", "/debts/{id}", "/savings", "/savings/{id}",
    "/statistics", "/settings", "/accounts", "/transactions", "/recurring", "/budgets", "/calendar", "/categories", "/personal-expenses"
  })
  public String page() {
    return "forward:/index.html";
  }
}
