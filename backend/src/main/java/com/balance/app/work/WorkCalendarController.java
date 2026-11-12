package com.balance.app.work;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/work-calendar")
public class WorkCalendarController {
 private final WorkCalendarService service;
 public WorkCalendarController(WorkCalendarService service){this.service=service;}
 @GetMapping("/completed-days") public WorkCalendarService.CompletedDays completedDays(@RequestParam(required=false) LocalDate from){return service.completedDays(from);}
 @GetMapping("/{month}") public WorkCalendarService.Month get(@PathVariable String month){return service.get(month);}
 @PutMapping("/{month}") public WorkCalendarService.Month save(@PathVariable String month,@Valid @RequestBody WorkCalendarService.Settings data){return service.save(month,data);}
 @PutMapping("/{month}/days/{date}") public WorkCalendarService.Month edit(@PathVariable String month,@PathVariable LocalDate date,@Valid @RequestBody WorkCalendarService.Edit data){return service.edit(month,date,data);}
 @PutMapping("/{month}/days/{date}/mark") public WorkCalendarService.Month mark(@PathVariable String month,@PathVariable LocalDate date,@Valid @RequestBody WorkCalendarService.Mark data){return service.mark(month,date,data);}
 @DeleteMapping("/{month}/days/{date}") public WorkCalendarService.Month reset(@PathVariable String month,@PathVariable LocalDate date,@RequestParam long version){return service.reset(month,date,version);}
}
