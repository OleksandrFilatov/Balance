import { t as tr } from "@/i18n";
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {Trash2,Undo2} from "lucide-react";
import {recurringApi,type Rule,type Run} from "@/api/recurring";
import {api} from "@/api/client";
import type {Transaction} from "@/api/types";
import {useRefreshFinance} from "@/api/queries";
import {useFinanceUi} from "@/providers/finance-ui";
import {Button} from "./ui/button";
import {Dialog} from "./ui/dialog";
import {Field,Input} from "./ui/input";
import {ErrorNotice} from "./feedback";

export function DeleteRecurring({rule,onRemoved,compact=false}:{rule:Rule;onRemoved?:()=>void;compact?:boolean}) {
 const [open,setOpen]=useState(false),refresh=useRefreshFinance(),{notify}=useFinanceUi();
 const mutation=useMutation({mutationFn:()=>recurringApi.remove(rule),onSuccess:async()=>{await refresh();setOpen(false);onRemoved?.();notify(tr("Платёж удалён из планов"));},retry:false});
 return <><Button variant="ghost" size={compact?"icon":"small"} className={"quiet-delete delete-action"+(compact?" goal-delete-quiet":"")} title={tr("Удалить платёж")} aria-label={tr("Удалить платёж: ")+rule.template.name} onClick={()=>setOpen(true)}><Trash2 size={16}/>{!compact&&tr("Удалить")}</Button>
 {open&&<Dialog open title={tr("Удалить платёж?")} description={tr("Платёж исчезнет из планов и распределения расходов. Уже проведённые оплаты сохранятся; их можно отдельно отменить в истории.")} onClose={()=>setOpen(false)} busy={mutation.isPending}>
 <ErrorNotice error={mutation.error}/><div className="dialog-footer"><Button variant="secondary" onClick={()=>setOpen(false)} disabled={mutation.isPending}>{tr("Оставить")}</Button><Button variant="destructive" onClick={()=>mutation.mutate()} disabled={mutation.isPending}>{tr("Удалить платёж")}</Button></div></Dialog>}</>;
}

export function CancelRecurringPayment({rule,run}:{rule:Rule;run:Run}) {
 const [open,setOpen]=useState(false),[reason,setReason]=useState(tr("Ошибочная запись оплаты")),refresh=useRefreshFinance();
 const mutation=useMutation({mutationFn:()=>recurringApi.cancelPayment(rule.id,run.id,reason),onSuccess:async()=>{await refresh();setOpen(false);},retry:false});
 if(run.cancelled)return <span className="soft-badge">{tr("Оплата отменена")}</span>;
 return <><Button variant="ghost" size="small" className="quiet-delete delete-action" onClick={()=>setOpen(true)} aria-label={tr("Отменить оплату: ")+run.id}><Undo2 size={15}/>{tr("Отменить оплату")}</Button>
 {open&&<Dialog open title={tr("Отменить записанную оплату?")} description={tr("Баланс и расходы будут пересчитаны. История отмены сохранится, повторного списания по этой дате не будет.")} busy={mutation.isPending} onClose={()=>setOpen(false)}>
 <Field label={tr("Причина отмены")}><Input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} required/></Field><ErrorNotice error={mutation.error}/><div className="dialog-footer"><Button variant="secondary" onClick={()=>setOpen(false)} disabled={mutation.isPending}>{tr("Оставить оплату")}</Button><Button variant="destructive" disabled={mutation.isPending||!reason.trim()} onClick={()=>mutation.mutate()}>{tr("Отменить оплату")}</Button></div></Dialog>}</>;
}

export function DeleteMoneyOperation({transaction,onDeleted,compact=false}:{transaction:Transaction;onDeleted?:()=>void;compact?:boolean}) {
 const [open,setOpen]=useState(false),refresh=useRefreshFinance();
 const mutation=useMutation({mutationFn:()=>api.deleteTransaction(transaction),onSuccess:async()=>{await refresh();setOpen(false);onDeleted?.();},retry:false});
 return <><Button variant="ghost" size={compact?"icon":"default"} className="quiet-delete delete-operation" aria-label={compact?tr("Удалить операцию: ")+(transaction.description||formatOperation(transaction)):undefined} title={compact?tr("Удалить операцию"):undefined} onClick={()=>setOpen(true)}><Trash2 size={16}/>{!compact&&tr("Удалить операцию")}</Button>
 {open&&<Dialog open title={tr("Удалить операцию?")} description={tr("Запись будет отменена. Баланс, расходы и статистика пересчитаются автоматически.")} busy={mutation.isPending} onClose={()=>setOpen(false)}><ErrorNotice error={mutation.error}/><div className="dialog-footer"><Button variant="secondary" onClick={()=>setOpen(false)}>{tr("Оставить")}</Button><Button variant="destructive" onClick={()=>mutation.mutate()} disabled={mutation.isPending}>{tr("Удалить операцию")}</Button></div></Dialog>}</>;
}
function formatOperation(t:Transaction){return t.operationDate+" · "+t.amount+" "+t.currency;}
