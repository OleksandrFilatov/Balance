import { t as tr } from "@/i18n";
import {useState} from "react";
import {useQuery,useMutation} from "@tanstack/react-query";
import {Wallet,ArrowUpRight,Plus} from "lucide-react";
import {request,write} from "@/api/client";
import {financeKey,useRefreshFinance} from "@/api/queries";
import {formatMoney,normalizeMoney} from "@/lib/money";
import {monthName} from "@/lib/dates";
import {Button} from "./ui/button";
import {Card} from "./ui/card";
import {Field,Input} from "./ui/input";
import {Dialog} from "./ui/dialog";
import {ErrorNotice,Loading} from "./feedback";
import {useFinanceUi} from "@/providers/finance-ui";
import {ProgressBar} from "./ui/progress";
import {MonthPicker} from "./month-picker";
import {berlinToday,moveCalendar} from "@/lib/calendar-dates";
interface Allowance {month:string;configured:boolean;amount:string|null;spent:string;remaining:string|null;percent:string|null;exceeded:boolean;version:number}
export function PersonalAllowance({month,onMonthChange,accountId}:{month:string;onMonthChange:(month:string)=>void;accountId?:string}){
 const q=useQuery({queryKey:[...financeKey,"personal-allowance",month],queryFn:({signal})=>request<Allowance>("/money/personal-allowance?month="+month,{signal})});
 const [editing,setEditing]=useState(false);
 const {openTransaction}=useFinanceUi();
 const currentDay=berlinToday();
 const addExpense=()=>openTransaction(undefined,accountId,{type:"EXPENSE",scope:"PERSONAL",operationDate:currentDay.startsWith(month+"-")?currentDay:month+"-01"});
 return <Card className="personal-allowance-card"><div className="panel-heading"><div><span className="eyebrow-label">{tr("Личный лимит")}</span><h2><Wallet size={20}/>{tr("Деньги для себя в месяц")}</h2></div><MonthPicker value={month} label={tr("Месяц личных расходов")} max={moveCalendar(berlinToday().slice(0,7)+"-01","month",24).slice(0,7)} onChange={onMonthChange}/></div>
 {q.error?<ErrorNotice error={q.error}/>:!q.data?<Loading/>:<><div className="allowance-amounts"><div><span>{tr("На себя ·")}{" "}{monthName(month)}</span><strong data-testid="personal-allowance">{q.data.configured?formatMoney(q.data.amount!):tr("Не задано")}</strong></div><div><span>{tr("Потрачено")}</span><strong data-testid="personal-spending-total">{formatMoney(q.data.spent)}</strong></div><div><span>{tr("Осталось от лимита")}</span><strong className={q.data.exceeded?"warning-text":""} data-testid="personal-allowance-remaining">{q.data.remaining===null?"—":formatMoney(q.data.remaining)}</strong></div></div>
 {q.data.configured&&<ProgressBar value={q.data.percent} label={tr("Использование личного лимита")} tone={q.data.exceeded?"warning":"accent"} caption/>}
 <div className="allowance-footer"><p>{tr("Лимит — ваш план на месяц. Добавленная трата учитывается в расходах и балансе.")}</p><div className="allowance-actions"><Button variant="secondary" size="small" onClick={()=>setEditing(true)}>{q.data.configured?tr("Изменить сумму"):tr("Указать сумму")}<ArrowUpRight size={15}/></Button><Button size="small" onClick={addExpense}><Plus size={15}/>{tr("Добавить трату")}</Button></div></div>
 {q.data.exceeded&&<p className="warning-text">{tr("Личный лимит превышен.")}</p>}
 {editing&&<AllowanceEditor current={q.data} onClose={()=>setEditing(false)}/>}</>}
 </Card>;
}
function AllowanceEditor({current,onClose}:{current:Allowance;onClose:()=>void}){const [amount,setAmount]=useState(current.amount??""),refresh=useRefreshFinance();const m=useMutation({mutationFn:()=>write<Allowance>("/money/personal-allowance?month="+current.month,"PUT",{amount:normalizeMoney(amount,false),version:current.version}),onSuccess:async()=>{await refresh();onClose();},retry:false});return <Dialog open title={tr("Деньги для себя · ")+monthName(current.month)} description={tr("Сколько вы хотите выделить на личные расходы в этом месяце?")} onClose={onClose} busy={m.isPending}><form className="form-stack" onSubmit={e=>{e.preventDefault();if(!m.isPending)m.mutate();}}><Field label={tr("Сумма на месяц, EUR")}><Input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required autoFocus/></Field><ErrorNotice error={m.error}/><div className="dialog-footer"><Button variant="secondary" disabled={m.isPending} onClick={onClose}>{tr("Отмена")}</Button><Button type="submit" disabled={m.isPending}>{tr("Сохранить")}</Button></div></form></Dialog>;}
