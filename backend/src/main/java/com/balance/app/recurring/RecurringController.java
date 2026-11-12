package com.balance.app.recurring;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recurring")
public class RecurringController {
  private final RecurringService service;

  public RecurringController(RecurringService s) {
    service = s;
  }

  @GetMapping
  public List<RecurringDto.View> list() {
    return service.list();
  }

  @PostMapping
  public ResponseEntity<RecurringDto.View> create(@Valid @RequestBody RecurringDto.Write d) {
    var r = service.create(d);
    return ResponseEntity.created(URI.create("/api/recurring/" + r.id())).body(r);
  }

  @GetMapping("/{id}")
  public RecurringDto.View get(@PathVariable UUID id,@RequestParam(defaultValue="false") boolean includeDeleted) {
    return service.get(id,includeDeleted);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id,@RequestParam long version) {
    service.delete(id,version);return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/executions/{executionId}/cancel")
  public RecurringDto.Execution cancelPayment(@PathVariable UUID id,@PathVariable UUID executionId,@Valid @RequestBody RecurringDto.CancelPayment body) {
    return service.cancelPayment(id,executionId,body);
  }

  @PutMapping("/{id}")
  public RecurringDto.View update(
      @PathVariable UUID id, @Valid @RequestBody RecurringDto.Update d) {
    return service.update(id, d);
  }

  @PostMapping("/{id}/confirm")
  public RecurringDto.Execution confirm(
      @PathVariable UUID id, @Valid @RequestBody RecurringDto.Confirm d) {
    return service.confirm(id, d.occurrenceDate(), d.operationDate(), d.version());
  }

  @GetMapping("/{id}/history")
  public RecurringDto.History history(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return service.history(id, page, size);
  }

  @PostMapping("/{id}/cancel")
  public RecurringDto.Cancellation cancel(
      @PathVariable UUID id, @Valid @RequestBody RecurringDto.Cancel d) {
    return service.cancel(id, d);
  }

  @GetMapping("/upcoming")
  public RecurringDto.Upcoming upcoming(@RequestParam(defaultValue = "30") int days) {
    return service.upcoming(days);
  }
  @GetMapping("/month")
  public RecurringDto.MonthPlan month(){return service.monthPlan();}
}
