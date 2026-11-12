package com.balance.app.account;

import com.balance.app.transaction.TransactionDto;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/money")
public class PersonalMoneyController {
  private final PersonalMoneyService service;
  private final HouseholdPlanService plan;
  private final HouseholdBillingService bills;
  private final PersonalAllowanceService allowance;
  private final MoneyPeriodService periods;

  public PersonalMoneyController(PersonalMoneyService s, HouseholdPlanService plan,HouseholdBillingService bills,PersonalAllowanceService allowance,MoneyPeriodService periods) {
    service = s;
    this.plan = plan;
    this.bills=bills;
    this.allowance=allowance;
    this.periods=periods;
  }

  @GetMapping("/period")
  public MoneyPeriodService.Period period(@RequestParam String month,@RequestParam(defaultValue="EUR") String currency){return periods.get(month,currency);}

  @GetMapping("/household-plan")
  public HouseholdPlanService.Plan plan(@RequestParam String month) { return plan.get(month); }

  @PutMapping("/household-plan")
  public HouseholdPlanService.Plan savePlan(@RequestParam String month,@Valid @RequestBody HouseholdPlanService.Income income) { return plan.save(month,income); }

  @GetMapping("/household-bills")
  public HouseholdBillingService.Statement bills(@RequestParam String month){return bills.statement(month);}
  @GetMapping("/personal-allowance")
  public PersonalAllowanceService.View allowance(@RequestParam String month){return allowance.get(month);}
  @PutMapping("/personal-allowance")
  public PersonalAllowanceService.View saveAllowance(@RequestParam String month,@Valid @RequestBody PersonalAllowanceService.Save body){return allowance.save(month,body);}
  @PostMapping("/household-bills/prepare")
  public HouseholdBillingService.Statement prepare(@RequestParam String month){return bills.prepare(month);}
  @PostMapping("/household-bills/pay")
  public HouseholdBillingService.Payment pay(@RequestParam String month,@Valid @RequestBody HouseholdBillingService.Pay body,@RequestHeader("Idempotency-Key") UUID key){return bills.pay(month,body,key);}
  @PostMapping("/household-bills/defer")
  public HouseholdDeferralService.Schedule defer(@RequestParam String month,@Valid @RequestBody HouseholdDeferralService.Change body,@RequestHeader("Idempotency-Key") UUID key){return bills.defer(month,body,key);}
  @PostMapping("/household-bills/defer/cancel")
  public HouseholdDeferralService.Schedule cancelDeferral(@RequestParam String month,@Valid @RequestBody HouseholdDeferralService.Undo body){return bills.cancelDeferral(month,body);}
  @PostMapping("/household-bills/payments/{id}/cancel")
  public HouseholdBillingService.Payment cancel(@PathVariable UUID id,@Valid @RequestBody HouseholdBillingService.Cancel body){return bills.cancel(id,body);}

  @GetMapping
  public PersonalMoneyDto.Overview overview(@RequestParam(defaultValue = "EUR") String currency) {
    return service.overview(currency);
  }

  @PostMapping("/default-account")
  public AccountDto.View defaultAccount(@Valid @RequestBody PersonalMoneyDto.DefaultAccount d) {
    return service.defaultAccount(d);
  }

  @GetMapping("/opening/{id}")
  public PersonalMoneyDto.Opening opening(@PathVariable UUID id) {
    return service.opening(id);
  }

  @PostMapping("/opening/{id}")
  public TransactionDto.View correct(
      @PathVariable UUID id,
      @Valid @RequestBody PersonalMoneyDto.CorrectOpening d,
      @RequestHeader("Idempotency-Key") UUID key) {
    return service.correctOpening(id, d, key);
  }

  @GetMapping("/household")
  public PersonalMoneyDto.Household household(@RequestParam String month) {
    return service.household(month);
  }
}
