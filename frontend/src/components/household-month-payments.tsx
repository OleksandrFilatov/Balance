import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useHouseholdNames } from "@/api/household-profile";
import {useRef,useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {Check,Undo2,CalendarArrowUp} from "lucide-react";
import {Link} from "react-router";
import {type BillMonth,type HouseholdStatement,type BillPayment,type BillSchedule,payHouseholdMonth,cancelHouseholdPayment,deferHouseholdMonth,undoHouseholdDeferral} from "@/api/household-plan";
import {useAccounts,useRefreshFinance} from "@/api/queries";
import {useMoney} from "@/api/money";
import {berlinToday,moveCalendar} from "@/lib/calendar-dates";
import {monthName,displayDate} from "@/lib/dates";
import {formatMoney,normalizeMoney,cents} from "@/lib/money";
import {Button} from "./ui/button";
import {Card} from "./ui/card";
import {Dialog} from "./ui/dialog";
import {Field,Input,Select} from "./ui/input";
import {ErrorNotice} from "./feedback";

export function HouseholdMonthPayments({statement,person}:{statement:HouseholdStatement;person:"mine"|"ira"}){
 const names=useHouseholdNames();
 const [pay,setPay]=useState<BillMonth|null>(null),[cancel,setCancel]=useState<BillPayment|null>(null),[defer,setDefer]=useState<BillMonth|null>(null),refresh=useRefreshFinance();
 const undo=useMutation({mutationFn:(schedule:BillSchedule)=>undoHouseholdDeferral(schedule),onSuccess:()=>refresh(),retry:false});
 const mutation=useMutation({mutationFn:()=>cancelHouseholdPayment(cancel!.id),onSuccess:async()=>{await refresh();setCancel(null);},retry:false});
 const current=statement.current,amount=current.remaining[person],future=current.month>berlinToday().slice(0,7);
 const unpaid=(m:BillMonth)=>m.items.some(i=>person==="mine"?!i.minePaid:!i.iraPaid);
 const personPayments=statement.payments.filter(p=>p.person===(person==="mine"?"MINE":"IRA"));
 const scheduleFor=(m:BillMonth)=>statement.schedules.find(s=>s.month===m.month);
 const deferredNow=(s:BillSchedule|undefined)=>!!s?.targetMonth&&s.targetMonth>berlinToday().slice(0,7)&&cents(s.deferred)>0n;
 const currentSchedule=scheduleFor(current);
 const controls=<>
  <Card className="household-month-payment"><div><span className="form-note">{monthName(current.month)}</span><h2>{unpaid(current)?tr("Оплата за месяц"):tr("Месяц оплачен")}</h2><p>{person==="mine"?tr("Можно оплатить всю сумму или часть. С вашего счёта спишется только подтверждённая сумма."):tr("Оплата: {0}. Отмечается отдельно, без списания с вашего счёта.",names.partner)}</p></div>
   <div className="household-settlement-actions"><Button disabled={future||amount===null||!unpaid(current)} onClick={()=>setPay(current)}><Check size={17}/>{future?tr("Будущий месяц"):!unpaid(current)?tr("Оплачено"):person==="mine"?deferredNow(currentSchedule)&&cents(currentSchedule?.payable??"0")===0n?tr("Оплатить раньше"):tr("Оплатить месяц"):tr("Отметить оплату: {0}",names.partner)}</Button>
   {person==="mine"&&current.month<"9999-12"&&amount!==null&&unpaid(current)&&cents(currentSchedule?.payable??amount)>0n&&<Button variant="secondary" onClick={()=>setDefer(current)}><CalendarArrowUp size={16}/>{tr("Перенести на следующий месяц")}</Button>}</div>
  </Card>
  <ErrorNotice error={undo.error}/>
  {person==="mine"&&deferredNow(currentSchedule)&&<p className="form-note" data-testid="household-payable-now">{tr("К оплате в выбранном месяце:")}{" "}{currentSchedule?.payable==null?tr("Уточните сумму"):formatMoney(currentSchedule.payable)}{tr(". Полный неоплаченный остаток остаётся в итогах выше.")}</p>}
  {person==="mine"&&statement.schedules.filter(s=>cents(s.deferred)>0n).map(s=><div className="household-deferral-note" key={s.month} data-testid={"deferral-"+s.month}><CalendarArrowUp size={17}/><div><strong>{formatMoney(s.deferred)}{" "}{tr("перенесено на")}{" "}{monthName(s.targetMonth!)}</strong><span>{tr("За")}{" "}{monthName(s.month)}{tr(". Задолженность сохранена; деньги не списывались.")}</span></div><Button variant="ghost" size="small" disabled={undo.isPending} onClick={()=>undo.mutate(s)}>{tr("Отменить перенос")}</Button></div>)}
  {person==="mine"&&statement.arrears.some(unpaid)&&<Card className="household-arrears"><h2>{tr("Неоплаченные месяцы")}</h2><p className="form-note">{tr("У каждого месяца свои зарплаты и суммы. Изменение нового месяца не меняет старые долги.")}</p>{statement.arrears.filter(unpaid).map(m=><div className="household-month-row" key={m.month} data-testid={"household-arrear-"+m.month}><div><strong>{monthName(m.month)}</strong><small>{tr("Долг за прошлый месяц")}</small></div><b>{m.remaining[person]===null?tr("Укажите зарплаты"):formatMoney(m.remaining[person]!)}</b>{m.remaining[person]===null?<Link className="text-link" to={"/household?month="+m.month}>{tr("Указать зарплаты →")}</Link>:<div className="household-arrear-actions"><Button variant="secondary" size="small" onClick={()=>setPay(m)}>{tr("Оплатить месяц")}</Button>{cents(scheduleFor(m)?.payable??m.remaining.mine??"0")>0n&&<Button variant="ghost" size="small" aria-label={tr("Перенести долг за ")+monthName(m.month)} onClick={()=>setDefer(m)}>{tr("Перенести")}</Button>}</div>}</div>)}</Card>}
  <details className="daily-details household-payment-history"><summary>{tr("История оплат по месяцам")}</summary>{personPayments.length?personPayments.map(p=><div className="household-month-row" key={p.id}><div><strong>{monthName(p.month)} · {p.person==="MINE"?tr("Моя оплата"):tr("Оплата: {0}",names.partner)}</strong><small>{displayDate(p.operationDate)}{p.cancelled?tr(" · Отменена"):""}</small></div><b>{formatMoney(p.amount)}</b>{!p.cancelled&&<Button variant="ghost" size="small" onClick={()=>setCancel(p)}><Undo2 size={15}/>{tr("Отменить")}</Button>}</div>):<p className="quiet-empty">{tr("Оплат пока нет.")}</p>}</details>
  {pay&&<PayMonth month={pay} person={person} schedule={scheduleFor(pay)} onClose={()=>setPay(null)}/>}
  {defer&&<DeferMonth month={defer} schedule={scheduleFor(defer)} onClose={()=>setDefer(null)}/>}
  {cancel&&<Dialog open title={tr("Отменить оплату месяца?")} description={tr("Деньги вернутся на ваш счёт, если списывались. Задолженность месяца восстановится, история сохранится.")} busy={mutation.isPending} onClose={()=>setCancel(null)}><ErrorNotice error={mutation.error}/><div className="dialog-footer"><Button variant="secondary" onClick={()=>setCancel(null)} disabled={mutation.isPending}>{tr("Оставить")}</Button><Button variant="destructive" disabled={mutation.isPending} onClick={()=>mutation.mutate()}>{tr("Отменить оплату месяца")}</Button></div></Dialog>}
 </>;
 return person==="mine"?controls:<><p className="form-note">{tr("Доля: {0}. Только выбранный месяц, без задолженности прошлых месяцев.",names.partner)}</p><details className="daily-details ira-payment-options"><summary>{tr("Отметки оплаты: {0} · необязательно",names.partner)}</summary>{controls}</details></>;
}
function PayMonth({month,person,schedule,onClose}:{month:BillMonth;person:"mine"|"ira";schedule?:BillSchedule;onClose:()=>void}){
 const names=useHouseholdNames();
 const accounts=useAccounts(),money=useMoney(),refresh=useRefreshFinance(),key=useRef(crypto.randomUUID());
 const candidates=accounts.data?.filter(a=>a.active&&a.currency==="EUR")??[];
 const [chosen,setChosen]=useState<string|null>(null),[date,setDate]=useState(berlinToday());
 const account=chosen??money.data?.defaultAccountId??(candidates.length===1?candidates[0].id:"");
 const amount=month.remaining[person]!;
 const [paymentAmount,setPaymentAmount]=useState(schedule?.payable&&cents(schedule.payable)>0n?schedule.payable:amount);
 const mutation=useMutation({mutationFn:()=>payHouseholdMonth(month.month,{person:person==="mine"?"MINE":"IRA",accountId:person==="mine"?account||null:null,operationDate:date,expected:amount,...(person==="mine"&&cents(amount)>0n?{amount:normalizeMoney(paymentAmount)}:{})},key.current),onSuccess:async()=>{await refresh();onClose();},retry:false});
 return <Dialog open title={tr("Оплата за ")+monthName(month.month)} description={person==="mine"?tr("Подтверждаете только свою долю за выбранный месяц. Долги других месяцев сохранятся."):tr("Отметка оплаты: {0}. Деньги с вашего счёта не списываются.",names.partner)} busy={mutation.isPending} onClose={onClose}>
  <form className="form-stack" onSubmit={e=>{e.preventDefault();if(!mutation.isPending)mutation.mutate();}}>
   <strong className="monthly-payment-amount">{formatMoney(amount)}</strong>
   {person==="mine"&&cents(amount)>0n&&<><Field label={tr("Сколько оплатить, EUR")}><Input value={paymentAmount} onChange={event=>setPaymentAmount(event.target.value)} inputMode="decimal" required/></Field><p className="form-note">{tr("Можно оплатить часть. Неоплаченный остаток сохранится; перенос на следующий месяц оформляется отдельно.")}</p></>}
   {person==="mine"&&<Field label={tr("Откуда оплатить")}><Select value={account} onChange={e=>setChosen(e.target.value)} required><option value="">{tr("Выберите счёт")}</option>{candidates.map(a=><option key={a.id} value={a.id}>{categoryName(a)}</option>)}</Select></Field>}
   <Field label={tr("Дата оплаты")}><Input type="date" value={date} onChange={e=>setDate(e.target.value)} max={berlinToday()} required/></Field>
   <ErrorNotice error={mutation.error??accounts.error}/><div className="dialog-footer"><Button variant="secondary" type="button" disabled={mutation.isPending} onClick={onClose}>{tr("Отмена")}</Button><Button type="submit" disabled={mutation.isPending||person==="mine"&&!account}>{mutation.isPending?tr("Записываем…"):tr("Подтвердить оплату месяца")}</Button></div>
  </form>
 </Dialog>;
}

function DeferMonth({month,schedule,onClose}:{month:BillMonth;schedule?:BillSchedule;onClose:()=>void}){
 const refresh=useRefreshFinance(),key=useRef(crypto.randomUUID()),guard=useRef(false);
 const [amount,setAmount]=useState(schedule?.payable??month.remaining.mine??""),[error,setError]=useState<Error|null>(null);
 const base=month.month>berlinToday().slice(0,7)?month.month:berlinToday().slice(0,7);
 const next=moveCalendar(base+"-01","month",1).slice(0,7);
 const mutation=useMutation({mutationFn:()=>deferHouseholdMonth(month.month,{amount:normalizeMoney(amount),expected:month.remaining.mine!,version:schedule?.version??0},key.current),onSuccess:async()=>{await refresh();onClose();},retry:false});
 return <Dialog open title={tr("Перенести коммуналку")} description={tr("Неоплаченная сумма за ")+monthName(month.month)+tr(" станет обязательством на ")+monthName(next)+tr(". Баланс и расходы не изменятся.")} busy={mutation.isPending} onClose={onClose}><form className="form-stack" onSubmit={async event=>{event.preventDefault();if(guard.current)return;guard.current=true;setError(null);try{await mutation.mutateAsync();}catch(e){setError(e as Error);}finally{guard.current=false;}}}><Field label={tr("Сколько перенести, EUR")}><Input value={amount} onChange={event=>setAmount(event.target.value)} inputMode="decimal" required disabled={mutation.isPending}/></Field><p className="form-note">{tr("Можно перенести всю сумму или часть. Она не исчезнет и не будет создана вторым долгом.")}</p><ErrorNotice error={error}/><div className="dialog-footer"><Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>{tr("Отмена")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?tr("Переносим…"):tr("Подтвердить перенос")}</Button></div></form></Dialog>;
}
