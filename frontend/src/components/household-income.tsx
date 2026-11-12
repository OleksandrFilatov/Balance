import { t as tr } from "@/i18n";
import { useHouseholdNames } from "@/api/household-profile";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveHouseholdIncome, type HouseholdPlan } from "@/api/household-plan";
import { useRefreshFinance } from "@/api/queries";
import { normalizeMoney } from "@/lib/money";
import {monthName} from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/feedback";
export function HouseholdIncome({plan,restriction,onReviewPayments}:{plan:HouseholdPlan;restriction?:"DEFERRED"|"PAID";onReviewPayments?:()=>void}) {
 const names=useHouseholdNames();
 const guard=useRef(false),refresh=useRefreshFinance();
 const initial=(value:HouseholdPlan)=>({base:value,mine:value.myIncome,ira:value.iraIncome,receiptDate:value.myReceiptDate});
 const [draft,setDraft]=useState(()=>initial(plan));
 const dirty=draft.mine!==draft.base.myIncome||draft.ira!==draft.base.iraIncome||draft.receiptDate!==draft.base.myReceiptDate;
 const stale=dirty&&draft.base.version!==plan.version;
 useEffect(()=>{if(!dirty)setDraft(initial(plan));},[plan.version,plan.myIncome,plan.iraIncome,plan.myReceiptDate,dirty]);
 const mutation=useMutation({mutationFn:async(data:FormData)=>{
   const saved=await saveHouseholdIncome(plan.month,normalizeMoney(String(data.get("mine")),false),normalizeMoney(String(data.get("ira")),false),draft.base.version,String(data.get("receiptDate")));
   await refresh();
   setDraft(initial(saved));
 },retry:false});
 return <details className="daily-details household-income" open={!plan.configured}>
  <summary>{tr("Зарплаты за")}{" "}{monthName(plan.month)}{" "}{tr("· месяц работы")}</summary>
  <form className="form-stack" onSubmit={async e=>{e.preventDefault();if(guard.current||stale)return;guard.current=true;try{await mutation.mutateAsync(new FormData(e.currentTarget));}catch{}finally{guard.current=false;}}}>
   <p className="form-note">{tr("Эти зарплаты используются только для")}{" "}{monthName(plan.month)}{tr(". Другие месяцы и их долги не изменятся. Все постоянные платежи делятся по зарплатам, дополнительные покупки — 50/50.")}</p>
   <p className="form-note">{tr("Это месяц работы. В прогноз деньги попадут в дату получения — обычно 15-го числа следующего месяца. Сохранение зарплаты не зачисляет деньги на счёт.")}</p>
   {restriction&&<div className="form-note" role="status" data-testid="income-settlement-restriction"><p>{restriction==="DEFERRED"?tr("За этот месяц есть перенос коммуналки. Для изменения зарплат сначала отмените перенос, затем сохраните зарплаты и при необходимости перенесите новую сумму снова."):tr("За этот месяц уже есть оплата коммуналки. Для изменения зарплат сначала отмените отметку оплаты в истории.")}{" "}{tr("Дата получения зарплаты может быть изменена отдельно, без изменения сумм.")}</p><Button variant="secondary" size="small" onClick={onReviewPayments}>{tr("Перейти к оплатам и переносам")}</Button></div>}
   <div className="household-income-grid">
    <Field label={tr("Моя зарплата, €")}><Input name="mine" inputMode="decimal" value={draft.mine} onChange={e=>setDraft({...draft,mine:e.target.value})} required disabled={mutation.isPending}/></Field>
    <Field label={tr("Зарплата: {0}, €",names.partner)}><Input name="ira" inputMode="decimal" value={draft.ira} onChange={e=>setDraft({...draft,ira:e.target.value})} required disabled={mutation.isPending}/></Field>
   </div>
   <Field label={tr("Когда получу мою зарплату")}><Input name="receiptDate" type="date" min={plan.month+"-01"} max="9999-12-31" value={draft.receiptDate} onChange={e=>setDraft({...draft,receiptDate:e.target.value})} required disabled={mutation.isPending}/></Field>
   <p className="form-note">{plan.configured ? tr("Постоянные платежи: {0} — {1}%, {2} — {3}%.",names.mine,plan.minePercent,names.partner,plan.iraPercent) : tr("Укажите зарплаты для распределения постоянных платежей.")}{" "}{tr("Дополнительные расходы — поровну.")}</p>
   {stale&&<div role="status"><p className="form-note">{tr("Зарплаты изменились в другом окне. Ваш ввод сохранён. Перед сохранением загрузите актуальные суммы и проверьте изменения.")}</p><Button variant="secondary" onClick={()=>{setDraft(initial(plan));mutation.reset();}}>{tr("Загрузить актуальные суммы")}</Button></div>}
   <ErrorNotice error={mutation.error}/><Button type="submit" disabled={mutation.isPending||stale}>{tr("Сохранить зарплаты")}</Button>
  </form>
 </details>;
}
