package com.balance.app.work;
import java.math.*;
import java.time.*;
/** Local estimate for standard statutory-insured employment, class I, no church tax. */
public final class GermanPayroll {
 private GermanPayroll(){}
 public record Estimate(BigDecimal net,BigDecimal tax,BigDecimal solidarity,BigDecimal pension,BigDecimal unemployment,BigDecimal health,BigDecimal care,String note,String status,Integer taxYear){}
 private static BigDecimal n(String v){return new BigDecimal(v);}
 private static BigDecimal charge(BigDecimal base,String rate){return base.multiply(n(rate)).setScale(2,RoundingMode.HALF_UP);}
 public static Estimate estimate(BigDecimal gross,YearMonth month,LocalDate birth,boolean saxony,int children,int under25,BigDecimal extra){
  if(gross.signum()==0)return new Estimate(n("0.00"),n("0.00"),n("0.00"),n("0.00"),n("0.00"),n("0.00"),n("0.00"),"Нет оплачиваемых часов.","READY",null);
  String status=month.getYear()!=2026?"UNSUPPORTED_YEAR":birth==null?"SETTINGS_REQUIRED":Period.between(birth,month.atDay(1).withDayOfYear(1)).getYears()>=64?"UNSUPPORTED_AGE":"READY";
  String issue=month.getYear()!=2026?"В Balance пока нет расчёта нетто на "+month.getYear()+" год. Часы и брутто рассчитаны; налоги и страховые взносы за этот год пока не рассчитаны.":birth==null?"Для нетто укажите дату рождения и проверьте параметры страховки.":Period.between(birth,month.atDay(1).withDayOfYear(1)).getYears()>=64?"Расчёт нетто с возрастными налоговыми льготами требует дополнительных параметров.":null;
  if(issue!=null)return new Estimate(null,null,null,null,null,null,null,issue,status,month.getYear()==2026?2026:null);
  boolean surcharge=children==0&&birth.plusYears(23).isBefore(month.atDay(1));
  var p=new Lohnsteuer2026();p.STKL=1;p.LZZ=2;p.RE4=gross.movePointRight(2);p.KVZ=extra;p.PVS=saxony?1:0;p.PVZ=surcharge?1:0;p.PVA=BigDecimal.valueOf(Math.max(0,Math.min(5,under25)-1));p.ZKF=BigDecimal.ZERO;p.R=0;p.calculate();
  var social=gross.min(n("8450"));var medical=gross.min(n("5812.50"));var pension=charge(social,"0.093");var unemployment=charge(social,"0.013");
  var health=medical.multiply(n("0.073").add(extra.divide(n("200")))).setScale(2,RoundingMode.HALF_UP);
  var rate=n(saxony?"0.023":"0.018").add(surcharge?n("0.006"):BigDecimal.ZERO).subtract(n("0.0025").multiply(p.PVA));var care=medical.multiply(rate).setScale(2,RoundingMode.HALF_UP);
  var tax=p.LSTLZZ.movePointLeft(2).setScale(2);var soli=p.SOLZLZZ.movePointLeft(2).setScale(2);
  return new Estimate(gross.subtract(tax).subtract(soli).subtract(pension).subtract(unemployment).subtract(health).subtract(care).setScale(2),tax,soli,pension,unemployment,health,care,"Оценка 2026 для обычной занятости: класс I, без церковного налога, государственная страховка. Не расчёт Mini-/Midijob. Без премий и льгот; при приёме или увольнении в середине месяца итог работодателя может отличаться.","READY",2026);
 }
}
