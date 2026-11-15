package com.balance.app.savings;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Planned reservations, never bank transactions. Prepayments cover the earliest scheduled contributions. */
@Service
@Transactional(readOnly=true)
public class SavingsSchedule {
 private static final BigDecimal ZERO=new BigDecimal("0.00");
 private final JdbcTemplate jdbc;
 public SavingsSchedule(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public record Due(UUID id,String name,LocalDate date,BigDecimal amount){}
 public static long count(LocalDate start,LocalDate end){
  if(end.isBefore(start))return 0;
  long months=ChronoUnit.MONTHS.between(YearMonth.from(start),YearMonth.from(end));
  return months+(start.plusMonths(months).isAfter(end)?0:1);
 }
 public static BigDecimal monthly(BigDecimal target,BigDecimal plan,LocalDate start,LocalDate deadline){
  if(plan.signum()>0)return plan;
  return deadline==null?ZERO:target.divide(BigDecimal.valueOf(Math.max(1,count(start,deadline))),2,RoundingMode.CEILING);
 }
 public static BigDecimal due(BigDecimal target,BigDecimal plan,LocalDate start,LocalDate deadline,LocalDate end,BigDecimal reserved){
  return due(target,plan,start,deadline,end,reserved,ZERO);
 }
 public static LocalDate effectiveDeadline(LocalDate start,LocalDate deadline){return deadline!=null&&deadline.isBefore(start)?start:deadline;}
 public static BigDecimal due(BigDecimal target,BigDecimal plan,LocalDate start,LocalDate deadline,LocalDate end,BigDecimal reserved,BigDecimal baseline){
  if(end.isBefore(start))return ZERO;
  deadline=effectiveDeadline(start,deadline);
  var cutoff=deadline!=null&&deadline.isBefore(end)?deadline:end;
  var planned=baseline.add(monthly(target.subtract(baseline).max(ZERO),plan,start,deadline).multiply(BigDecimal.valueOf(count(start,cutoff)))).min(target);
  return planned.subtract(reserved.max(ZERO)).max(ZERO).min(target.subtract(reserved).max(ZERO));
 }
 public List<Due> until(LocalDate end){
  return jdbc.query("select g.id,g.name,g.target,g.monthly_plan,g.plan_from_date,g.plan_reserved_baseline,g.deadline,coalesce((select sum(e.amount) from savings_entries e where e.goal_id=g.id),0) reserved from savings_goals g where not g.deleted and g.status='ACTIVE' order by g.start_date,g.id",(rs,n)->{
   var start=rs.getObject("plan_from_date",LocalDate.class);var deadline=effectiveDeadline(start,rs.getObject("deadline",LocalDate.class));
   return new Due(rs.getObject("id",UUID.class),rs.getString("name"),start.isAfter(end)?start:deadline!=null&&deadline.isBefore(end)?deadline:end,due(rs.getBigDecimal("target"),rs.getBigDecimal("monthly_plan"),start,deadline,end,rs.getBigDecimal("reserved"),rs.getBigDecimal("plan_reserved_baseline")));
  }).stream().filter(d->d.amount().signum()>0).toList();
 }
}
