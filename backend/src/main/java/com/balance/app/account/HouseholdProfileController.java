package com.balance.app.account;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/money/household-profile")
public class HouseholdProfileController {
  private final HouseholdProfileService service;
  public HouseholdProfileController(HouseholdProfileService service) { this.service = service; }
  @GetMapping public HouseholdProfileService.Profile get() { return service.get(); }
  @PutMapping public HouseholdProfileService.Profile save(@Valid @RequestBody HouseholdProfileService.Save input) {
    return service.save(input);
  }
}
