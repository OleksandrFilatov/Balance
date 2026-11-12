package com.balance.app.account;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class MandatoryBreakdownTest {
  private PersonalMoneyDto.Overview overview(List<PersonalMoneyDto.Deduction> lines, long unknown) {
    return new PersonalMoneyDto.Overview("EUR",LocalDate.of(2026,11,8),LocalDate.of(2026,11,30),new BigDecimal("2000"),BigDecimal.ZERO,BigDecimal.ZERO,new BigDecimal("55.56"),null,unknown,null,lines);
  }
  private PersonalMoneyDto.Deduction line(String type,String amount){return new PersonalMoneyDto.Deduction(type,type,LocalDate.of(2026,11,8),amount==null?null:new BigDecimal(amount),"/money");}
  @Test void exactCentsAndMultiplePersonalPaymentsKeepTheirOwnGroups(){
    var split=overview(List.of(line("DEBT","40.01"),line("HOUSEHOLD","10.02"),line("PERSONAL","3.03"),line("PERSONAL","2.50")),0).breakdown();
    assertEquals(0,new BigDecimal("40.01").compareTo(split.debts().amount()));assertEquals(0,new BigDecimal("10.02").compareTo(split.household().amount()));assertEquals(0,new BigDecimal("5.53").compareTo(split.personal().amount()));assertEquals(0,split.total().compareTo(split.debts().amount().add(split.household().amount()).add(split.personal().amount())));assertTrue(split.complete());
  }
  @Test void incompleteShareDoesNotMakeOtherKnownGroupsUnknown(){
    var split=overview(List.of(line("DEBT","40.01"),line("HOUSEHOLD",null),line("PERSONAL","15.55")),1).breakdown();
    assertFalse(split.complete());assertFalse(split.household().complete());assertTrue(split.debts().complete());assertTrue(split.personal().complete());
  }
}
