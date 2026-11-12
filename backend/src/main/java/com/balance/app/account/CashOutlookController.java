package com.balance.app.account;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/summary/outlook")
public class CashOutlookController {
 private final CashOutlookService service;
 public CashOutlookController(CashOutlookService service){this.service=service;}
 @GetMapping public CashOutlookService.View get(@RequestParam String month,@RequestParam(defaultValue="EUR")String currency){return service.get(month,currency);}
}
