import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {CalendarClock,ChevronLeft,ChevronRight} from "lucide-react";
import {useDebtPlan,configureDebtAuto,type DebtPlan} from "@/api/debts";
import {useAccounts,useRefreshFinance} from "@/api/queries";
import {useMoney} from "@/api/money";
import {formatMoney} from "@/lib/money";
import {Button} from "./ui/button";
import {Dialog} from "./ui/dialog";
import {Field,Select} from "./ui/input";
import {ErrorNotice,Loading} from "./feedback";
import {ProgressBar} from "./ui/progress";
import {DebtScheduleEditor} from "./debt-schedule-editor";
const dateLabel=(date:string)=>new Intl.DateTimeFormat(getLocale(),{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
const segmentMonth=(date:string)=>new Intl.DateTimeFormat(getLocale(),{month:"short",year:"2-digit",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
function InstallmentAmount({remaining,paid}:{remaining:string;paid:boolean}){return <><small className="installment-caption">{paid?tr("Взнос закрыт"):tr("К оплате")}</small><strong className={"installment-amount "+(paid?"is-paid":"")}>{paid?tr("Оплачено"):formatMoney(remaining)}</strong></>;}
export function DebtMonthProgress({id,active,compact=false}:{id:string;active:boolean;compact?:boolean}){
 const [offset,setOffset]=useState<number|undefined>(),q=useDebtPlan(id,offset),[settings,setSettings]=useState(false),[schedule,setSchedule]=useState(false);
 if(q.error)return <ErrorNotice error={q.error}/>;if(!q.data)return <Loading label={tr("Загружаем сроки долга")}/>;
 const p=q.data;
 const start=compact?Math.max(0,Math.min(p.segments.length-6,Number(p.completedMonths)-Number(p.offset)-1)):0;
 const segments=compact?p.segments.slice(start,start+6):p.segments;
 return <div className="debt-month-overview">
  <div className="debt-dates"><span>{tr("Открыт")}{" "}<b>{dateLabel(p.openedOn)}</b></span>{p.firstDate&&!compact&&<span>{tr("Платежи с")}{" "}<b>{dateLabel(p.firstDate)}</b></span>}{p.endDate&&<span>{tr("До")}{" "}<b>{dateLabel(p.endDate)}</b></span>}</div>
  {!!segments.length&&<><div className="debt-month-caption"><span>{tr("Оплачено месяцев")}</span><strong>{p.completedMonths} / {p.months}</strong></div><div className={"debt-month-segments "+(compact?"is-compact":"")} aria-label={tr("Прогресс погашения по месяцам")}>{segments.map(s=><div className={"debt-month-segment "+s.status.toLowerCase()} key={s.number} title={dateLabel(s.date)+" · "+formatMoney(s.paid)+tr(" из ")+formatMoney(s.amount)}><ProgressBar value={s.percent} label={tr("Платёж ")+dateLabel(s.date)} tone={s.status==="PAID"?"success":s.status==="PARTIAL"?"warning":"accent"}/><span>{segmentMonth(s.date)}</span><InstallmentAmount remaining={s.remaining} paid={s.status==="PAID"}/></div>)}</div>{!compact&&Number(p.months)>24&&<div className="debt-month-paging"><Button size="small" variant="ghost" aria-label={tr("Предыдущие месяцы долга")} disabled={!Number(p.offset)} onClick={()=>setOffset(Math.max(0,Number(p.offset)-24))}><ChevronLeft size={15}/></Button><span>{tr("Месяцы")}{" "}{Number(p.offset)+1}–{Number(p.offset)+p.segments.length}</span><Button size="small" variant="ghost" aria-label={tr("Следующие месяцы долга")} disabled={Number(p.offset)+p.segments.length>=Number(p.months)} onClick={()=>setOffset(Number(p.offset)+24)}><ChevronRight size={15}/></Button></div>}</>}
  {p.firstDate&&<div className="debt-auto-state"><span className={p.automatic?"debt-auto-enabled":"form-note"}><CalendarClock size={16}/>{p.automatic?tr("Автоплатёж в дату оплаты"):tr("Автооплата выключена")}</span>{active&&<Button variant="ghost" size="small" onClick={()=>setSettings(true)}>{p.automatic?tr("Настроить"):tr("Включить автооплату")}</Button>}</div>}
  {p.error&&<p className="warning-text debt-auto-error">{tr(p.error)}</p>}
  {p.firstDate&&Number(p.completedMonths)===0&&p.nextPayment&&p.nextPayment!==p.firstDate&&<p className="warning-text debt-auto-error">{tr("Следующая дата отличается от исходного графика. Прогноз учитывает ближайший взнос от следующей даты. Перед оплатой согласуйте даты кнопкой «Перенести график».")}</p>}
  {active&&p.firstDate&&(p.canEditSchedule?<Button size="small" variant="ghost" onClick={()=>setSchedule(true)}>{tr("Перенести график")}</Button>:!compact&&<p className="form-note">{tr("График защищён: уже есть история погашений.")}</p>)}
  {schedule&&<DebtScheduleEditor plan={p} onClose={()=>setSchedule(false)}/>}
  {settings&&<DebtAutoSettings plan={p} onClose={()=>setSettings(false)}/>}
 </div>;
}
function DebtAutoSettings({plan,onClose}:{plan:DebtPlan;onClose:()=>void}){
 const [enabled,setEnabled]=useState(plan.automatic),[account,setAccount]=useState<string|null>(null),accounts=useAccounts(),money=useMoney(),refresh=useRefreshFinance();
 const available=accounts.data?.filter(a=>a.active&&a.currency==="EUR")??[],chosen=account??plan.accountId??money.data?.defaultAccountId??(available.length===1?available[0].id:"");
 const mutation=useMutation({mutationFn:()=>configureDebtAuto(plan.debtId,enabled,chosen||null,plan.version),onSuccess:async()=>{await refresh();onClose();},retry:false});
 return <Dialog open title={tr("Автоматическая оплата долга")} description={tr("Balance запишет платёж в назначенную дату и уменьшит остаток долга. Приложение должно быть запущено.")} busy={mutation.isPending} onClose={onClose}><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!mutation.isPending)mutation.mutate();}}><label className="checkbox-field"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{tr("Автоплатёж в дату оплаты")}</label>{enabled&&<Field label={tr("Счёт автооплаты")}><Select value={chosen} onChange={e=>setAccount(e.target.value)} required><option value="">{tr("Выберите счёт")}</option>{available.map(a=><option key={a.id} value={a.id}>{categoryName(a)}</option>)}</Select></Field>}<p className="form-note">{tr("При нехватке денег платёж останется неоплаченным. После пополнения Balance попробует снова. Это запись в вашем учёте, а не перевод в банке.")}</p><ErrorNotice error={mutation.error??accounts.error}/><div className="dialog-footer"><Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>{tr("Отмена")}</Button><Button type="submit" disabled={mutation.isPending||enabled&&!chosen}>{tr("Сохранить")}</Button></div></form></Dialog>;
}
