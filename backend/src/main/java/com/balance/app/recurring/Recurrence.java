package com.balance.app.recurring;

import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

@Component
public class Recurrence {
  public enum Frequency {
    ONCE,
    DAILY,
    WEEKLY,
    MONTHLY,
    QUARTERLY,
    YEARLY
  }

  public LocalDate at(LocalDate anchor, Frequency frequency, long index) {
    return at(anchor,frequency,index,null);
  }

  public LocalDate at(LocalDate anchor, Frequency frequency, long index,LocalDate end) {
    if (index < 0) throw new IllegalArgumentException("Negative index");
    try {
      LocalDate date =
          switch (frequency) {
            case ONCE -> index==0?anchor:null;
            case DAILY -> anchor.plusDays(index);
            case WEEKLY -> anchor.plusWeeks(index);
            case MONTHLY -> anchor.plusMonths(index);
            case QUARTERLY -> anchor.plusMonths(Math.multiplyExact(index, 3));
            case YEARLY -> anchor.plusYears(index);
          };
      return date==null||date.getYear()>9999||date.getYear()<1||end!=null&&date.isAfter(end)?null:date;
    } catch (DateTimeException | ArithmeticException e) {
      return null;
    }
  }

  public long onOrAfter(LocalDate anchor, Frequency f, LocalDate from) {
    if (!from.isAfter(anchor)) return 0;
    long index =
        switch (f) {
          case ONCE -> 1;
          case DAILY -> ChronoUnit.DAYS.between(anchor, from);
          case WEEKLY -> ChronoUnit.DAYS.between(anchor, from) / 7;
          case MONTHLY -> ChronoUnit.MONTHS.between(YearMonth.from(anchor), YearMonth.from(from));
          case QUARTERLY ->
              ChronoUnit.MONTHS.between(YearMonth.from(anchor), YearMonth.from(from)) / 3;
          case YEARLY -> from.getYear() - anchor.getYear();
        };
    LocalDate date = at(anchor, f, index);
    while (date != null && date.isBefore(from)) {
      index++;
      date = at(anchor, f, index);
    }
    return index;
  }

  public long count(LocalDate anchor,Frequency frequency,LocalDate from,LocalDate through,LocalDate end){
    var last=end!=null&&end.isBefore(through)?end:through;if(last.isBefore(from))return 0;
    long start=onOrAfter(anchor,frequency,from),finish=onOrAfter(anchor,frequency,last);
    return Math.max(0,finish-start+(at(anchor,frequency,finish,last)==null?0:1));
  }
}
