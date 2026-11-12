import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import {useId,useState} from "react";
import {AreaChart,Area,BarChart,Bar,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from "recharts";
import {ArrowDownLeft,ArrowUpRight,ChartNoAxesCombined,ChevronLeft,ChevronRight} from "lucide-react";
import {useSummary,useAnalytics,useMonthlySummary} from "@/api/queries";
import {useDisplayCurrency} from "@/api/money";
import {berlinToday,calendarRange,moveCalendar} from "@/lib/calendar-dates";
import {displayDate,monthName} from "@/lib/dates";
import {formatMoney,chartNumber,cents} from "@/lib/money";
import {PageHeading} from "@/components/app-shell";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Select} from "@/components/ui/input";
import {MonthPicker} from "@/components/month-picker";
import {ErrorNotice,Loading} from "@/components/feedback";
import {CashOutlook} from "@/components/cash-outlook";
const colors=["#657fea","#aa96d7","#dfa66b","#6ca5bc","#bf83ac","#8999b1"];
const monthLabel=(m:string)=>new Intl.DateTimeFormat(getLocale(),{month:"short",timeZone:"UTC"}).format(new Date(m+"-01T12:00:00Z"));
export function StatisticsPage(){
 const [month,setMonth]=useState(berlinToday().slice(0,7)),{currency,currencies,setCurrency}=useDisplayCurrency(),range=calendarRange(month+"-01","month"),gradient=useId(),maxMonth=moveCalendar(berlinToday(),"month",24).slice(0,7);
 const summary=useSummary(range.from,range.to,currency),analytics=useAnalytics(range.from,range.to,currency),history=useMonthlySummary(month,currency);
 const daily=analytics.data?.daily.map(r=>({...r,value:chartNumber(r.amount)}))??[];
 const categories=analytics.data?.categories.map((r,index)=>({...r,name:categoryName(r),value:chartNumber(r.amount),color:colors[index%colors.length]}))??[];
 const monthly=history.data?.map(r=>({...r,incoming:chartNumber(r.income),outgoing:chartNumber(r.expense),label:monthLabel(r.month)}))??[];
 const monthActivity=monthly.some(r=>cents(r.income)!==0n||cents(r.expense)!==0n),categoryActivity=categories.some(c=>cents(c.amount)!==0n);
 const shortMoney=(v:number)=>new Intl.NumberFormat(getLocale(),{notation:"compact",maximumFractionDigits:1}).format(v);
 const error=summary.error??analytics.error??history.error;
 return <div className="statistics-studio">
  <PageHeading title={tr("Статистика")} description={tr("Понимайте, откуда приходят деньги и на что они уходят.")}/>
  <div className="statistics-toolbar"><div className="statistics-month-picker"><Button variant="ghost" size="icon" aria-label={tr("Предыдущий месяц статистики")} disabled={month==="0001-01"} onClick={()=>setMonth(moveCalendar(month+"-01","month",-1).slice(0,7))}><ChevronLeft size={18}/></Button><MonthPicker value={month} max={maxMonth} label={tr("Месяц статистики")} onChange={setMonth} navigation={false}/><Button variant="ghost" size="icon" aria-label={tr("Следующий месяц статистики")} disabled={month>=maxMonth} onClick={()=>setMonth(moveCalendar(month+"-01","month",1).slice(0,7))}><ChevronRight size={18}/></Button></div><span className="form-note">{monthName(month)}</span>{currencies.length>1&&<Select aria-label={tr("Валюта статистики")} value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c}>{c}</option>)}</Select>}</div>
  <CashOutlook key={month+currency} month={month} currency={currency}/>
  {error?<ErrorNotice error={error} retry={()=>{void summary.refetch();void analytics.refetch();void history.refetch();}}/>:!summary.data||!analytics.data||!history.data?<Loading label={tr("Собираем статистику")}/>:<details className="statistics-actual-details" open={month<=berlinToday().slice(0,7)}><summary>{tr("История и фактические расходы")}</summary>
   <div className="statistics-metrics">
    <Card className="statistics-metric"><span className="statistics-metric-icon incoming"><ArrowDownLeft size={21}/></span><div><span>{tr("Доходы за месяц")}</span><strong data-testid="statistics-income">{formatMoney(summary.data.income,currency)}</strong></div></Card>
    <Card className="statistics-metric"><span className="statistics-metric-icon outgoing"><ArrowUpRight size={21}/></span><div><span>{tr("Расходы за месяц")}</span><strong data-testid="statistics-expense">{formatMoney(summary.data.expense,currency)}</strong></div></Card>
    <Card className="statistics-metric net"><span className="statistics-metric-icon"><ChartNoAxesCombined size={21}/></span><div><span>{tr("Доходы минус расходы")}</span><strong data-testid="statistics-net">{formatMoney(summary.data.net,currency)}</strong></div></Card>
   </div>
   <Card className="statistics-chart-card statistics-months"><div className="panel-heading"><div><span className="eyebrow-label">{tr("Динамика денег")}</span><h2>{tr("Доходы и расходы за полгода")}</h2></div><div className="statistics-legend"><span><i style={{background:"#657fea"}}/>{tr("Доходы")}</span><span><i style={{background:"#dfa66b"}}/>{tr("Расходы")}</span></div></div>
    {monthActivity?<div className="statistics-chart" role="img" aria-label={tr("Доходы и расходы за шесть месяцев")}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{top:15,right:8,left:0,bottom:0}} barGap={5}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:11}}/><YAxis width={48} axisLine={false} tickLine={false} tickFormatter={shortMoney} tick={{fill:"var(--muted-foreground)",fontSize:10}}/><Tooltip cursor={{fill:"var(--muted)"}} content={({active,payload})=>{const r=payload?.[0]?.payload as typeof monthly[number]|undefined;return active&&r?<div className="chart-money-tooltip"><strong>{monthName(r.month)}</strong><p>{tr("Доходы ·")}{" "}{formatMoney(r.income,currency)}</p><p>{tr("Расходы ·")}{" "}{formatMoney(r.expense,currency)}</p></div>:null;}}/><Bar dataKey="incoming" fill="#657fea" radius={[5,5,0,0]} maxBarSize={34} isAnimationActive={false}/><Bar dataKey="outgoing" fill="#dfa66b" radius={[5,5,0,0]} maxBarSize={34} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>:<ChartEmpty text={tr("После первого дохода или расхода здесь появится динамика ваших денег.")}/>}
   </Card>
   <div className="statistics-detail-grid">
    <Card className="statistics-chart-card"><div className="panel-heading"><div><span className="eyebrow-label">{tr("Ритм месяца")}</span><h2>{tr("Расходы по дням")}</h2></div><span className="soft-badge">{currency}</span></div>
     {daily.length?<div className="statistics-chart" role="img" aria-label={tr("График расходов по дням")}><ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{top:15,right:12,left:0,bottom:0}}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8598ef" stopOpacity={.35}/><stop offset="100%" stopColor="#8598ef" stopOpacity={.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(-2)} axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:11}}/><YAxis width={45} tickFormatter={shortMoney} axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:10}}/><Tooltip content={({active,payload})=>{const r=payload?.[0]?.payload as typeof daily[number]|undefined;return active&&r?<div className="chart-money-tooltip">{displayDate(r.date)}<p>{formatMoney(r.amount,currency)}</p></div>:null;}}/><Area type="linear" dataKey="value" stroke="#7b8fe9" strokeWidth={2.5} fill={"url(#"+gradient+")"} isAnimationActive={false} dot={{r:3,fill:"#7b8fe9",strokeWidth:0}}/></AreaChart></ResponsiveContainer></div>:<ChartEmpty text={tr("В выбранном месяце расходов пока нет.")}/>}
    </Card>
    <Card className="statistics-chart-card"><div className="panel-heading"><div><span className="eyebrow-label">{tr("Структура расходов")}</span><h2>{tr("На что уходят деньги")}</h2></div></div>
     {categoryActivity?<>{categories.every(c=>c.value>=0)&&<div className="statistics-donut" role="img" aria-label={tr("Расходы по категориям")}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="87%" paddingAngle={categories.length>1?3:0} stroke="none" isAnimationActive={false}>{categories.map(c=><Cell key={c.categoryId} fill={c.color}/>)}</Pie><Tooltip content={({active,payload})=>{const r=payload?.[0]?.payload as typeof categories[number]|undefined;return active&&r?<div className="chart-money-tooltip">{categoryName(r)}<p>{formatMoney(r.amount,currency)}</p></div>:null;}}/></PieChart></ResponsiveContainer><div className="statistics-donut-label"><span>{tr("Всего")}</span><strong>{formatMoney(summary.data.expense,currency)}</strong></div></div>}
      <ul className="statistics-category-list">{categories.map(c=><li key={c.categoryId}><i style={{background:c.color}}/><span>{categoryName(c)}</span><strong>{formatMoney(c.amount,currency)}</strong></li>)}</ul>{categories.some(c=>c.value<0)&&<p className="form-note">{tr("Возвраты и сторно показаны с исходным знаком.")}</p>}</>:<ChartEmpty text={tr("Добавьте расход, чтобы увидеть категории.")}/>}
    </Card>
   </div>
   <p className="form-note statistics-footnote">{tr("Только проведённые доходы и расходы. Переводы, резервирование накоплений и основной долг не увеличивают расходы.")}</p>
  </details>}
 </div>;
}
function ChartEmpty({text}:{text:string}){return <div className="statistics-empty"><ChartNoAxesCombined size={28}/><p>{text}</p></div>;}
