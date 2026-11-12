import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router";
import {BarChart,Bar,CartesianGrid,XAxis,Tooltip,ResponsiveContainer} from "recharts";
import {ArrowDownLeft,ArrowUpRight} from "lucide-react";
import {request} from "@/api/client";
import {financeKey} from "@/api/queries";
import {berlinToday,calendarLabel} from "@/lib/calendar-dates";
import {monthName} from "@/lib/dates";
import {formatMoney,chartNumber} from "@/lib/money";
import {Card} from "./ui/card";
import {Button} from "./ui/button";
import {ErrorNotice,Loading} from "./feedback";

interface Line{id:string;name:string;date:string|null;amount:string|null;kind:string;href:string}
interface Outlook{month:string;currency:string;actualIncome:string;actualExpense:string;actualOutflow:string;expectedIncome:string;plannedOutflow:string;complete:boolean;actualCount:string;actual:Line[];expected:Line[];payments:Line[]}
export function CashOutlook({month,currency}:{month:string;currency:string}){
 const q=useQuery({queryKey:[...financeKey,"cash-outlook",month,currency],queryFn:({signal})=>request<Outlook>("/summary/outlook?"+new URLSearchParams({month,currency}),{signal})});
 const [view,setView]=useState<"plan"|"actual">(month<berlinToday().slice(0,7)?"actual":"plan"),[shown,setShown]=useState(8);
 if(q.error)return <ErrorNotice error={q.error} retry={()=>void q.refetch()}/>;if(!q.data)return <Loading label={tr("Загружаем факт и ожидаемые платежи")}/>;
 const d=q.data,rows=view==="plan"?[...d.expected,...d.payments]:d.actual;
 const data=[{name:tr("Поступления"),fact:chartNumber(d.actualIncome),plan:chartNumber(d.expectedIncome),actual:d.actualIncome,expected:d.expectedIncome},{name:tr("Платежи"),fact:chartNumber(d.actualOutflow),plan:chartNumber(d.plannedOutflow),actual:d.actualOutflow,expected:d.plannedOutflow}];
 return <Card className="cash-outlook" data-testid="cash-outlook">
  <div className="panel-heading"><div><span className="eyebrow-label">{monthName(month)}</span><h2>{tr("Что пришло и что впереди")}</h2></div><span className="soft-badge">{currency}</span></div>
  <div className="outlook-totals"><div><span>{tr("Ожидается доходов")}</span><strong data-testid="outlook-income">{formatMoney(d.expectedIncome,currency)}</strong></div><div><span>{d.complete?tr("Ещё предстоит оплатить"):tr("Известная часть платежей")}</span><strong data-testid="outlook-payments">{formatMoney(d.plannedOutflow,currency)}</strong></div></div>
  <div className="outlook-actual-line"><span>{tr("Фактически проведено платежей")}</span><strong data-testid="outlook-actual-payments">{formatMoney(d.actualOutflow,currency)}</strong></div>
  <div className="outlook-chart" role="img" aria-label={tr("Проведённые и ожидаемые поступления и платежи")}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:20,bottom:0,left:20}} barSize={44} stackOffset="sign"><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:11}}/><Tooltip cursor={{fill:"var(--muted)"}} content={({active,payload})=>{const row=payload?.[0]?.payload as typeof data[number]|undefined;return active&&row?<div className="chart-money-tooltip">{categoryName(row)}<p>{tr("Проведено:")}{" "}{formatMoney(row.actual,currency)}</p><p>{tr("Ожидается:")}{" "}{formatMoney(row.expected,currency)}</p></div>:null;}}/><Bar dataKey="fact" stackId="money" fill="#687fe4" isAnimationActive={false}/><Bar dataKey="plan" stackId="money" fill="#b5bdef" radius={[5,5,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
  <div className="outlook-legend"><span><i/>{tr("Проведено")}</span><span><i/>{tr("Ожидается")}</span></div>
  <div className="period-segments" role="group" aria-label={tr("Операции статистики")}><Button variant="ghost" aria-pressed={view==="plan"} onClick={()=>{setView("plan");setShown(8);}}>{tr("План")}</Button><Button variant="ghost" aria-pressed={view==="actual"} onClick={()=>{setView("actual");setShown(8);}}>{tr("Факт")}</Button></div>
  {!rows.length?<p className="quiet-empty">{view==="plan"?tr("В выбранном месяце нет ожидаемых поступлений и платежей. Зарплата появится в месяце её получения."):tr("Проведённых доходов и платежей за этот месяц пока нет.")}</p>:<div className="outlook-lines">{rows.slice(0,shown).map((r,i)=>{const incoming=r.kind==="INCOME"||r.kind==="SALARY";const title=r.kind==="SALARY"&&/^salary\/\d{4}-\d{2}$/.test(r.id)?tr("Зарплата за ")+monthName(r.id.slice(7)):r.name;return <Link key={r.id+i} to={r.href}><span className={"outlook-line-icon "+(incoming?"incoming":"outgoing")}>{incoming?<ArrowDownLeft size={15}/>:<ArrowUpRight size={15}/>}</span><div><strong>{title}</strong><small>{view==="actual"?tr("Проведено"):incoming?tr("Ожидаемый доход"):tr("К оплате")}{r.date?" · "+calendarLabel(r.date):tr(" · за выбранный месяц")}{r.kind==="DEBT_PRINCIPAL"?tr(" · основной долг"):""}</small></div><b>{r.amount===null?tr("Уточните сумму"):formatMoney(r.amount,currency)}</b></Link>;})}</div>}
  {rows.length>shown&&<Button size="small" variant="ghost" onClick={()=>setShown(shown+8)}>{tr("Показать ещё")}</Button>}
  {view==="actual"&&Number(d.actualCount)>200&&<Link className="text-link" to={"/money?month="+month}>{tr("Показаны последние 200 записей. Открыть всю историю →")}</Link>}
  {!d.complete&&view==="plan"&&<p className="warning-text">{tr("Есть неуточнённые обязательства. Известные суммы показаны отдельно.")}</p>}
  <p className="form-note">{tr("План не списывает деньги. Платежи включают основной долг; он не является обычным расходом. Переводы и резервирование накоплений исключены.")}</p>
 </Card>;
}
