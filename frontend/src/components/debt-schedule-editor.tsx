import { t as tr } from "@/i18n";
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {write} from "@/api/client";
import type {DebtPlan} from "@/api/debts";
import {useRefreshFinance} from "@/api/queries";
import {berlinToday} from "@/lib/calendar-dates";
import {Dialog} from "./ui/dialog";
import {Button} from "./ui/button";
import {Input,Field} from "./ui/input";
import {ErrorNotice} from "./feedback";
export function DebtScheduleEditor({plan,onClose}:{plan:DebtPlan;onClose:()=>void}){
 const [first,setFirst]=useState(plan.nextPayment??plan.firstDate??berlinToday()),refresh=useRefreshFinance();
 const mutation=useMutation({mutationFn:()=>write<DebtPlan>("/debts/"+plan.debtId+"/schedule","PUT",{firstDate:first,version:plan.debtVersion}),onSuccess:async()=>{await refresh();onClose();},retry:false});
 return <Dialog open title={tr("Перенести график долга")} description={tr("Все месяцы сдвинутся вместе. Общая задолженность, сумма и количество взносов сохранятся. Автооплата будет приостановлена до проверки новых дат.")} onClose={onClose} busy={mutation.isPending}><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!mutation.isPending)mutation.mutate();}}><Field label={tr("Новая дата первого платежа")}><Input type="date" value={first} min={berlinToday()} max="9999-12-31" required onChange={e=>setFirst(e.target.value)} disabled={mutation.isPending}/></Field><p className="form-note">{tr("После первого проведённого погашения этот перенос недоступен: история оплаченных месяцев защищена.")}</p><ErrorNotice error={mutation.error}/><div className="dialog-footer"><Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>{tr("Отмена")}</Button><Button type="submit" disabled={mutation.isPending}>{tr("Перенести весь график")}</Button></div></form></Dialog>;
}
