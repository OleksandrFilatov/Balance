import { t as tr } from "@/i18n";
import { Link,useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { berlinToday, moveCalendar } from "@/lib/calendar-dates";
import { monthName } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { MoneyPeriod } from "@/api/money";
import { Button } from "./ui/button";
import { MonthPicker } from "./month-picker";

export function useMoneyMonth(){
  const [params,setParams]=useSearchParams(),current=berlinToday().slice(0,7),maximum=moveCalendar(current+"-01","month",24).slice(0,7);
  const candidate=params.get("month")??current;
  const month=/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(candidate)&&candidate>="0001-01"&&candidate<=maximum?candidate:current;
  function setMonth(value:string){if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value)||value<"0001-01"||value>maximum)return;const next=new URLSearchParams(params);if(value===current)next.delete("month");else next.set("month",value);setParams(next,{replace:true});}
  return {month,current,maximum,setMonth};
}
export function MoneyMonth({month,current,maximum,onChange,label="Месяц баланса",household=false}:{month:string;current:string;maximum:string;onChange:(value:string)=>void;label?:string;household?:boolean}){
  return <div className="money-month-control" data-testid="money-month-control">
    <div className="money-month-picker"><Button variant="ghost" size="icon" aria-label={household?tr("Предыдущий месяц коммуналки"):tr("Предыдущий месяц баланса")} disabled={month==="0001-01"} onClick={()=>onChange(moveCalendar(month+"-01","month",-1).slice(0,7))}><ChevronLeft size={16}/></Button><MonthPicker label={label} value={month} max={maximum} onChange={onChange} navigation={false}/><Button variant="ghost" size="icon" aria-label={household?tr("Следующий месяц коммуналки"):tr("Следующий месяц баланса")} disabled={month>=maximum} onClick={()=>onChange(moveCalendar(month+"-01","month",1).slice(0,7))}><ChevronRight size={16}/></Button></div>
    {month!==current&&<Button variant="ghost" size="small" onClick={()=>onChange(current)}>{tr("Текущий месяц")}</Button>}
    <span className={"money-period-tag "+(month>current?"is-forecast":"")}>{month>current?tr("Прогноз"):month<current?tr("По истории"):tr("Сейчас")}</span>
  </div>;
}
export function MoneyPeriodNote({period}:{period:MoneyPeriod}){
  if(period.mode==="CURRENT")return null;
  return <div className="money-period-explanation">{!period.complete&&<p className="warning-text money-period-warning">{tr("Для точного прогноза нужно уточнить план.")}{" "}<Link to={"/household?month="+period.month}>{tr("Зарплаты и коммуналка →")}</Link> <Link to="/debts">{tr("Проверить графики долгов →")}</Link></p>}<details className="daily-details money-period-note"><summary>{period.mode==="FORECAST"?tr("Как накапливается остаток по месяцам"):tr("Как посчитана история")}</summary>
    {period.warnings.map(w=><p key={w}>{w}</p>)}
    {!!period.steps.length&&<div className="money-rollover" data-testid="money-rollover">{period.steps.map((s,i)=><div key={s.month}><strong>{monthName(s.month)}{i===0?tr(" · с сегодняшнего дня"):""}</strong><dl><div><dt>{tr("Перенос остатка")}</dt><dd>{s.opening===null?tr("Уточните план"):formatMoney(s.opening,period.overview.currency)}</dd></div><div><dt>{tr("Ожидается доходов")}</dt><dd>+ {formatMoney(s.income,period.overview.currency)}</dd></div><div><dt>{tr("Мои платежи")}</dt><dd>− {formatMoney(s.payments,period.overview.currency)}</dd></div><div><dt>{tr("Останется")}</dt><dd>{s.closing===null?tr("Уточните план"):formatMoney(s.closing,period.overview.currency)}</dd></div></dl></div>)}</div>}
  </details></div>;
}
