package com.balance.app.work;
import com.balance.app.service.*;
import jakarta.validation.constraints.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
@Service
@Transactional
public class WorkCalendarService {
 private final JdbcTemplate jdbc;
 public WorkCalendarService(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public record Settings(@NotNull @DecimalMin("0.01") @DecimalMax("1000") @Digits(integer=4,fraction=2) BigDecimal hourlyRate,@NotNull LocalTime start,@NotNull LocalTime end,LocalDate birthDate,@NotNull Boolean saxony,@Min(0) @Max(20) int children,@Min(0) @Max(5) int childrenUnder25,@NotNull @DecimalMin("0") @DecimalMax("10") @Digits(integer=2,fraction=2) BigDecimal healthExtra,@PositiveOrZero long version){}
 public record Edit(@NotNull Boolean working,LocalTime start,LocalTime end,@PositiveOrZero long version){}
 public record Mark(@NotNull Boolean completed,@PositiveOrZero long version){}
 public record Day(LocalDate date,boolean working,LocalTime start,LocalTime end,int paidMinutes,BigDecimal gross,boolean custom,boolean completed){}
 public record Worked(int shifts,int paidMinutes,BigDecimal hours,BigDecimal gross,GermanPayroll.Estimate payroll,BigDecimal deductions){}
 public record Month(String month,boolean configured,Settings settings,List<Day> days,int shifts,int paidMinutes,BigDecimal hours,BigDecimal gross,GermanPayroll.Estimate payroll,Worked worked,BigDecimal plannedDeductions,BigDecimal completionPercent){}
 public record CompletedDays(LocalDate from,LocalDate through,int total){}
 @Transactional(readOnly=true)
 public CompletedDays completedDays(LocalDate from){
  var through=LocalDate.now(ZoneId.of("Europe/Berlin"));
  if(from!=null&&(from.getYear()<1||from.isAfter(through)))throw DomainException.invalid("Выберите дату начала не позднее сегодняшнего дня.");
  // Marks are unique by work_date; removing or resetting a shift also removes its mark.
  return jdbc.queryForObject("select min(work_date) as first_date,count(*) as total from work_shift_marks where work_date between ? and ?",
    (rs,n)->new CompletedDays(from==null?rs.getObject("first_date",LocalDate.class):from,through,rs.getInt("total")),
    from==null?LocalDate.of(1,1,1):from,through);
 }
 private YearMonth parse(String m){try{if(!m.matches("[0-9]{4}-(0[1-9]|1[0-2])")||m.startsWith("0000"))throw new Exception();return YearMonth.parse(m);}catch(Exception e){throw DomainException.invalid("Выберите месяц.");}}
 public static int minutes(LocalTime start,LocalTime end){if(start==null||end==null||start.getSecond()!=0||end.getSecond()!=0||start.getNano()!=0||end.getNano()!=0)throw DomainException.invalid("Укажите часы и минуты смены.");int raw=(end.toSecondOfDay()-start.toSecondOfDay())/60;if(raw<0)raw+=1440;if(raw<=30)throw DomainException.invalid("Смена должна быть длиннее перерыва 30 минут.");return raw-30;}
 private Settings settings(YearMonth m){var r=jdbc.query("select * from work_months where month=?",(rs,n)->new Settings(rs.getBigDecimal("hourly_rate"),rs.getObject("start_time",LocalTime.class),rs.getObject("end_time",LocalTime.class),rs.getObject("birth_date",LocalDate.class),rs.getBoolean("saxony"),rs.getInt("children"),rs.getInt("children_under25"),rs.getBigDecimal("health_extra"),rs.getLong("version")),m.atDay(1));return r.isEmpty()?null:r.getFirst();}
 private Settings defaults(){return new Settings(new BigDecimal("15.33"),LocalTime.of(8,0),LocalTime.of(16,0),null,false,0,0,new BigDecimal("2.90"),0);}
 private Settings inherited(YearMonth m){var dates=jdbc.queryForList("select month from work_months where month<? order by month desc limit 1",LocalDate.class,m.atDay(1));if(dates.isEmpty())return defaults();var s=settings(YearMonth.from(dates.getFirst()));return new Settings(s.hourlyRate(),s.start(),s.end(),s.birthDate(),s.saxony(),s.children(),s.childrenUnder25(),s.healthExtra(),0);}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Month get(String month){var m=parse(month);var saved=settings(m);var s=saved==null?inherited(m):saved;var overrides=new HashMap<LocalDate,Edit>();jdbc.query("select * from work_shifts where work_date between ? and ?",rs->{overrides.put(rs.getObject("work_date",LocalDate.class),new Edit(rs.getBoolean("working"),rs.getObject("start_time",LocalTime.class),rs.getObject("end_time",LocalTime.class),0));},m.atDay(1),m.atEndOfMonth());var marked=new HashSet<>(jdbc.queryForList("select work_date from work_shift_marks where month=?",LocalDate.class,m.atDay(1)));var days=new ArrayList<Day>();int count=0,total=0;BigDecimal gross=new BigDecimal("0.00");
  for(var date=m.atDay(1);!date.isAfter(m.atEndOfMonth());date=date.plusDays(1)){var edit=overrides.get(date);boolean work=edit==null?date.getDayOfWeek().getValue()<=5:edit.working();var start=edit==null?s.start():edit.start();var end=edit==null?s.end():edit.end();int min=work?minutes(start,end):0;var amount=s.hourlyRate().multiply(BigDecimal.valueOf(total+min)).divide(new BigDecimal("60"),2,RoundingMode.HALF_UP).subtract(gross);days.add(new Day(date,work,work?start:null,work?end:null,min,amount,edit!=null,work&&marked.contains(date)));if(work)count++;total+=min;gross=gross.add(amount);}
  var completed=days.stream().filter(d->d.working()&&d.completed()).toList();int workedMinutes=completed.stream().mapToInt(Day::paidMinutes).sum();
  var earned=s.hourlyRate().multiply(BigDecimal.valueOf(workedMinutes)).divide(new BigDecimal("60"),2,RoundingMode.HALF_UP);
  var earnedPayroll=GermanPayroll.estimate(earned,m,s.birthDate(),s.saxony(),s.children(),s.childrenUnder25(),s.healthExtra());var plannedPayroll=GermanPayroll.estimate(gross,m,s.birthDate(),s.saxony(),s.children(),s.childrenUnder25(),s.healthExtra());
  var worked=new Worked(completed.size(),workedMinutes,BigDecimal.valueOf(workedMinutes).divide(new BigDecimal("60"),2,RoundingMode.HALF_UP),earned,earnedPayroll,earnedPayroll.net()==null?null:earned.subtract(earnedPayroll.net()));
  var percent=total==0?BigDecimal.ZERO:BigDecimal.valueOf(workedMinutes).multiply(new BigDecimal("100")).divide(BigDecimal.valueOf(total),2,RoundingMode.HALF_UP);
  return new Month(month,saved!=null,s,List.copyOf(days),count,total,BigDecimal.valueOf(total).divide(new BigDecimal("60"),2,RoundingMode.HALF_UP),gross,plannedPayroll,worked,plannedPayroll.net()==null?null:gross.subtract(plannedPayroll.net()),percent);
 }
 private void lock(){jdbc.execute("select pg_advisory_xact_lock(729145099)");}
 public Month save(String month,Settings s){var m=parse(month);minutes(s.start(),s.end());if(s.birthDate()!=null&&(s.birthDate().isAfter(LocalDate.now(ZoneId.of("Europe/Berlin")))||s.birthDate().getYear()<1900))throw DomainException.invalid("Проверьте дату рождения.");if(s.childrenUnder25()>s.children())throw DomainException.invalid("Детей до 25 лет не может быть больше общего числа детей.");lock();var old=settings(m);Money.version(old==null?0:old.version(),s.version());jdbc.update("insert into work_months(month,hourly_rate,start_time,end_time,birth_date,saxony,children,children_under25,health_extra,version) values(?,?,?,?,?,?,?,?,?,1) on conflict(month) do update set hourly_rate=excluded.hourly_rate,start_time=excluded.start_time,end_time=excluded.end_time,birth_date=excluded.birth_date,saxony=excluded.saxony,children=excluded.children,children_under25=excluded.children_under25,health_extra=excluded.health_extra,version=work_months.version+1",m.atDay(1),s.hourlyRate(),s.start(),s.end(),s.birthDate(),s.saxony(),s.children(),s.childrenUnder25(),s.healthExtra());return get(month);}
 public Month edit(String month,LocalDate date,Edit edit){var m=parse(month);if(!YearMonth.from(date).equals(m))throw DomainException.invalid("Дата не в выбранном месяце.");if(edit.working())minutes(edit.start(),edit.end());lock();var old=settings(m);Money.version(old==null?0:old.version(),edit.version());if(!edit.working())jdbc.update("delete from work_shift_marks where work_date=?",date);if(old==null)save(month,inherited(m));else jdbc.update("update work_months set version=version+1 where month=?",m.atDay(1));jdbc.update("insert into work_shifts(work_date,month,working,start_time,end_time) values(?,?,?,?,?) on conflict(work_date) do update set working=excluded.working,start_time=excluded.start_time,end_time=excluded.end_time",date,m.atDay(1),edit.working(),edit.working()?edit.start():null,edit.working()?edit.end():null);return get(month);}
 public Month reset(String month,LocalDate date,long version){var m=parse(month);if(!YearMonth.from(date).equals(m))throw DomainException.invalid("Дата не в выбранном месяце.");lock();var old=settings(m);Money.version(old==null?0:old.version(),version);jdbc.update("delete from work_shift_marks where work_date=?",date);jdbc.update("delete from work_shifts where work_date=?",date);if(old!=null)jdbc.update("update work_months set version=version+1 where month=?",m.atDay(1));return get(month);}
 public Month mark(String month,LocalDate date,Mark mark){
  var m=parse(month);if(!YearMonth.from(date).equals(m))throw DomainException.invalid("Дата не в выбранном месяце.");lock();var old=settings(m);Money.version(old==null?0:old.version(),mark.version());
  if(mark.completed()&&!get(month).days().stream().anyMatch(d->d.date().equals(date)&&d.working()))throw DomainException.invalid("Сначала добавьте смену на этот день.");
  if(old==null){if(!mark.completed())return get(month);save(month,inherited(m));}else jdbc.update("update work_months set version=version+1 where month=?",m.atDay(1));
  if(mark.completed())jdbc.update("insert into work_shift_marks(work_date,month) values(?,?) on conflict(work_date) do nothing",date,m.atDay(1));else jdbc.update("delete from work_shift_marks where work_date=?",date);
  return get(month);
 }

}
