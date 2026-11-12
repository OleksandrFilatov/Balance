import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import type {CSSProperties} from "react";
import {useDebtPlan,type Debt} from "@/api/debts";
import {formatMoney} from "@/lib/money";
import {Button} from "./ui/button";

const monthLabel=(date:string)=>new Intl.DateTimeFormat(getLocale(),{month:"short",year:"2-digit",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
export function DebtCompactSchedule({debt,onPay}:{debt:Debt;onPay:()=>void}){
 const q=useDebtPlan(debt.id),p=q.data;
 const next=p?.segments.findIndex(s=>s.date===debt.terms.nextPayment)??-1,start=Math.max(0,next-1);
 const segments=p?.segments.slice(start,start+4)??[];
 if(!p)return <div className="debt-mini-schedule-placeholder">{q.error?tr("График недоступен"):tr("Загружаем график…")}</div>;
 if(!segments.length)return debt.terms.nextPayment?<div className="debt-mini-single"><span>{tr("К")}{" "}{monthLabel(debt.terms.nextPayment)}</span><strong>{p.nextAmount===null?tr("Уточнить сумму"):formatMoney(p.nextAmount)}</strong></div>:<div className="debt-mini-single"><span>{tr("Без фиксированного срока")}</span></div>;
 return <div className="debt-mini-schedule" aria-label={tr("Краткий график: ")+debt.terms.name}>{segments.map(s=>{
  const actionable=debt.status==="ACTIVE"&&s.date===debt.terms.nextPayment;
  return <Button key={s.number} variant="ghost" className={"debt-mini-segment "+s.status.toLowerCase()} disabled={!actionable} aria-label={actionable?tr("Оплатить взнос ")+s.date+": "+debt.terms.name:monthLabel(s.date)+" · "+(s.status==="PAID"?tr("Оплачено"):formatMoney(s.remaining))} title={actionable?tr("Можно оплатить заранее. Фактическая дата — сегодня."):s.status==="PAID"?tr("Взнос оплачен"):tr("Сначала оплатите предыдущий взнос")} onClick={onPay} style={{"--installment-progress":Number(s.percent)+"%"} as CSSProperties}><span>{monthLabel(s.date)}</span><b>{s.status==="PAID"?tr("Оплачено"):formatMoney(s.remaining)}</b></Button>;
 })}</div>;
}
