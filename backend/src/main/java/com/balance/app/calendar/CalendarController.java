package com.balance.app.calendar;

import static com.balance.app.calendar.CalendarDto.*;

import com.balance.app.debt.DebtDto;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {
  private final CalendarService service;

  public CalendarController(CalendarService s) {
    service = s;
  }

  @GetMapping
  public Report report(
      @RequestParam LocalDate from,
      @RequestParam LocalDate to,
      @RequestParam(defaultValue = "EUR") String currency,
      @RequestParam(required = false) Type type,
      @RequestParam(required = false) Status status,
      @RequestParam(defaultValue = "false") boolean includeBacklog) {
    return service.report(from, to, currency, type, status, includeBacklog);
  }

  @GetMapping("/upcoming")
  public Report upcoming(@RequestParam(defaultValue = "EUR") String currency) {
    return service.upcoming(currency);
  }

  @GetMapping("/obligations")
  public Obligations obligations(@RequestParam LocalDate from, @RequestParam LocalDate to,
      @RequestParam(defaultValue = "EUR") String currency) {
    return service.obligations(from, to, currency);
  }

  @PostMapping("/debts/{id}/confirm")
  public DebtDto.Payment confirm(
      @PathVariable UUID id,
      @Valid @RequestBody DebtConfirm d,
      @RequestHeader("Idempotency-Key") UUID key) {
    return service.confirmDebt(id, d, key);
  }
}
