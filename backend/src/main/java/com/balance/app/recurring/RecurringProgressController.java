package com.balance.app.recurring;

import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recurring/progress")
public class RecurringProgressController {
 private final RecurringProgressService service;
 public RecurringProgressController(RecurringProgressService service){this.service=service;}
 @GetMapping public List<RecurringProgressService.Progress> get(@RequestParam String month){return service.get(month);}
}
