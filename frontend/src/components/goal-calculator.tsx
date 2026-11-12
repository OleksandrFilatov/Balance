import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import {useRef,useState,type FormEvent} from "react";
import {useMutation,useQuery} from "@tanstack/react-query";
import {Calculator,ArrowRight,Check} from "lucide-react";
import {useGoals,savingsApi,type Goal} from "@/api/savings";
import {useMoney} from "@/api/money";
import {request,write} from "@/api/client";
import {financeKey,useRefreshFinance} from "@/api/queries";
import {berlinToday,calendarLabel} from "@/lib/calendar-dates";
import {formatMoney,normalizeMoney,cents} from "@/lib/money";
import {Dialog} from "./ui/dialog";
import {Button} from "./ui/button";
import {Field,Input,Select} from "./ui/input";
import {ErrorNotice,Loading} from "./feedback";
import {useSavingsAdvice,useAdviceCalculation} from "@/api/savings-advice";

interface Calculation {goalId:string;expectedIncome:string;mandatoryPayments:string;personalSpending:string;otherGoalsMonthly:string;available:string;budgetGap:string;remaining:string;requiredMonthly:string|null;recommended:string;shortfall:string;monthsNeeded:string|null;estimatedDate:string|null;deadline:string|null;feasible:boolean}
export function GoalCalculator({onClose}:{onClose:()=>void}){
 const goals=useGoals(),money=useMoney(),month=berlinToday().slice(0,7),advice=useSavingsAdvice(month),[automatic,setAutomatic]=useState(true);
 const allowance=useQuery({queryKey:[...financeKey,"personal-allowance",month],queryFn:({signal})=>request<{amount:string|null}>("/money/personal-allowance?month="+month,{signal})});
 return <Dialog open title={tr("Калькулятор целей")} description={tr("Данные подставляются из ваших денег, обязательств и запаса на жизнь.")} onClose={onClose}>
  <div className="period-segments goal-calculator-mode" role="group" aria-label={tr("Данные калькулятора")}><Button variant="ghost" aria-pressed={automatic} onClick={()=>setAutomatic(true)}>{tr("Мои расчёты")}</Button><Button variant="ghost" aria-pressed={!automatic} onClick={()=>setAutomatic(false)}>{tr("Свой сценарий")}</Button></div>
  {goals.error||money.error||allowance.error?<ErrorNotice error={goals.error??money.error??allowance.error}/>:!goals.data||!money.data||!allowance.data?<Loading/>:automatic?<AutomaticGoalPlan goals={goals.data.filter(g=>g.status==="ACTIVE"&&cents(g.forecast.remaining)>0n)} living={advice.input.living??allowance.data.amount??"0"} initialGoal={advice.input.goalId}/>:<CalculatorForm goals={goals.data.filter(g=>g.status==="ACTIVE")} income={money.data.income} mandatory={money.data.unknownObligations==="0"?money.data.mandatory:""} personal={allowance.data.amount??"0"}/>}
 </Dialog>;
}
function AutomaticGoalPlan({goals,living,initialGoal}:{goals:Goal[];living:string;initialGoal:string|null}){
 const [selected,setSelected]=useState(initialGoal&&goals.some(g=>g.id===initialGoal)?initialGoal:goals[0]?.id??""),goal=goals.find(g=>g.id===selected),refresh=useRefreshFinance();
 const q=useAdviceCalculation(berlinToday().slice(0,7),goal?{goalId:goal.id,living,useBalanceOnly:true}:null),result=q.data;
 const save=useMutation({mutationFn:()=>savingsApi.update(goal!,{name:goal!.name,description:goal!.description,target:goal!.target,currency:goal!.currency,deadline:goal!.deadline,monthlyPlan:result!.goal!.recommended},goal!.status),onSuccess:async()=>{await refresh();},retry:false});
 if(!goals.length)return <p className="quiet-empty">{tr("Создайте цель с нужной суммой — здесь появится расчёт взноса.")}</p>;
 return <div className="form-stack goal-calculator goal-calculator-auto"><Field label={tr("На какую цель")}><Select value={selected} onChange={e=>{setSelected(e.target.value);save.reset();}}>{goals.map(g=><option key={g.id} value={g.id}>{categoryName(g)}</option>)}</Select></Field>
 {q.error?<ErrorNotice error={q.error} retry={()=>void q.refetch()}/>:!result||q.isFetching?<Loading label={tr("Обновляем расчёт по вашим данным")}/>:<><div className="goal-auto-inputs"><div><span>{tr("Деньги сейчас")}</span><strong>{formatMoney(result.balance)}</strong></div><div><span>{tr("Мои платежи")}</span><strong>{result.unknownObligations==="0"?formatMoney(result.mandatory):tr("Уточните суммы")}</strong></div><div><span>{tr("На жизнь из ваших расчётов")}</span><strong data-testid="goal-auto-living">{formatMoney(living)}</strong></div><div><span>{tr("Уже накоплено")}</span><strong>{formatMoney(result.reserved)}</strong></div></div>
 {!result.ready?<p className="warning-text">{tr("Уточните обязательные платежи и зарплаты в коммуналке. Пока точную рекомендацию дать нельзя.")}</p>:result.goal&&<section className="calculator-result" data-testid="goal-calculation"><div className="calculator-recommendation"><span>{tr("На эту цель сейчас можно отложить")}</span><strong data-testid="goal-recommended">{formatMoney(result.goal.recommended)}</strong></div><dl className="calculator-breakdown"><div><dt>{tr("Осталось накопить")}</dt><dd>{formatMoney(result.goal.remaining)}</dd></div>{result.goal.requiredMonthly!==null&&<div><dt>{tr("Для выбранного срока нужно")}</dt><dd>{formatMoney(result.goal.requiredMonthly)}{" "}{tr("/ мес.")}</dd></div>}{result.goal.estimatedDate&&<div><dt>{tr("Если повторять взнос каждый месяц")}</dt><dd>{calendarLabel(result.goal.estimatedDate)}</dd></div>}</dl>{result.shortage!==null&&cents(result.shortage)>0n&&<p className="warning-text">{tr("На платежи и жизнь пока не хватает")}{" "}{formatMoney(result.shortage)}.</p>}{cents(result.goal.recommended)>0n&&<Button variant="secondary" disabled={save.isPending||save.isSuccess} onClick={()=>save.mutate()}>{save.isSuccess?tr("План сохранён"):save.isPending?tr("Сохраняем…"):tr("Использовать как месячный план")}</Button>}<ErrorNotice error={save.error}/></section>}
 <p className="form-note">{tr("Считаем только деньги на счетах. Будущая зарплата не прибавляется, просмотр не пополняет цель. Для другого дохода откройте «Свой сценарий».")}</p></>}
 </div>;
}
function CalculatorForm({goals,income,mandatory,personal}:{goals:Goal[];income:string;mandatory:string;personal:string}){
 const [goalId,setGoalId]=useState(goals[0]?.id??""),[result,setResult]=useState<Calculation|null>(null),[saved,setSaved]=useState(false),refresh=useRefreshFinance(),guard=useRef(false);
 const goal=goals.find(g=>g.id===goalId);
 const calculate=useMutation({mutationFn:(data:FormData)=>write<Calculation>("/savings/calculator","POST",{goalId,expectedIncome:normalizeMoney(String(data.get("income")),false),mandatoryPayments:normalizeMoney(String(data.get("mandatory")),false),personalSpending:normalizeMoney(String(data.get("personal")),false)}),retry:false});
 const save=useMutation({mutationFn:()=>savingsApi.update(goal!,{name:goal!.name,description:goal!.description,target:goal!.target,currency:goal!.currency,deadline:goal!.deadline,monthlyPlan:result!.recommended},goal!.status),onSuccess:async()=>{setSaved(true);await refresh();},retry:false});
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(guard.current)return;guard.current=true;setSaved(false);save.reset();setResult(null);try{setResult(await calculate.mutateAsync(new FormData(e.currentTarget)));}catch{/* Error is shown below. */}finally{guard.current=false;}}
 if(!goals.length)return <p className="quiet-empty">{tr("Сначала создайте цель с нужной суммой. Затем здесь можно подобрать комфортный взнос.")}</p>;
 return <form className="form-stack goal-calculator" onSubmit={submit} onChange={()=>{setResult(null);setSaved(false);calculate.reset();save.reset();}}>
  <fieldset className="form-stack" disabled={calculate.isPending||save.isPending}>
   <Field label={tr("На какую цель")}><Select value={goalId} onChange={e=>setGoalId(e.target.value)}>{goals.map(g=><option key={g.id} value={g.id}>{categoryName(g)}</option>)}</Select></Field>
   <Field label={tr("Ожидаемый доход в месяц, EUR")}><Input name="income" inputMode="decimal" defaultValue={income==="0"||income==="0.00"?"":income} required placeholder={tr("Сколько вы получите")}/></Field>
   <div className="form-grid"><Field label={tr("Мои обязательные платежи, EUR")}><Input name="mandatory" inputMode="decimal" defaultValue={mandatory} required placeholder={tr("Укажите свою долю")}/></Field><Field label={tr("Оставить на личные расходы, EUR")}><Input name="personal" inputMode="decimal" defaultValue={personal} required/></Field></div>
   <p className="form-note">{tr("Обязательства подставлены за текущий месяц, включая неоплаченное. Уточните их для своего сценария. Планы остальных целей тоже учитываются.")}</p>
   <Button type="submit" disabled={calculate.isPending}><Calculator size={16}/>{calculate.isPending?tr("Считаем…"):tr("Рассчитать")}<ArrowRight size={16}/></Button>
  </fieldset>
  <ErrorNotice error={calculate.error??save.error}/>
  {result&&<section className="calculator-result" aria-live="polite" data-testid="goal-calculation">
   <div className="calculator-recommendation"><span>{tr("Можно откладывать на эту цель")}</span><strong data-testid="goal-recommended">{formatMoney(result.recommended)}<small>{" "}{tr("/ месяц")}</small></strong></div>
   <dl className="calculator-breakdown"><div><dt>{tr("Доступно для этой цели")}</dt><dd>{formatMoney(result.available)}</dd></div><div><dt>{tr("Учтены планы других целей")}</dt><dd>{formatMoney(result.otherGoalsMonthly)}</dd></div>{result.requiredMonthly!==null&&<div><dt>{tr("Нужно для выбранного срока")}</dt><dd>{formatMoney(result.requiredMonthly)}{" "}{tr("/ мес.")}</dd></div>}<div><dt>{tr("Осталось накопить")}</dt><dd>{formatMoney(result.remaining)}</dd></div><div><dt>{tr("Расчётная дата достижения")}</dt><dd>{result.estimatedDate?calendarLabel(result.estimatedDate):tr("Пока не определена")}</dd></div></dl>
   {!result.feasible&&<p className="warning-text">{cents(result.budgetGap)>0n?tr("Дохода не хватает на введённый месячный план: ")+formatMoney(result.budgetGap)+".":result.deadline&&result.deadline<berlinToday()?tr("Срок цели уже прошёл. Измените дату или месячный план."):result.requiredMonthly!==null?tr("До выбранного срока не хватает ещё ")+formatMoney(result.shortfall)+tr(" в месяц."):tr("Для накоплений пока нет свободной суммы.")}</p>}
   <p className="form-note">{tr("Расчёт без процентов: первый взнос — в этом месяце, следующие — ежемесячно в то же число. Это план, а не списание денег и не гарантированный результат.")}</p>
   {cents(result.recommended)>0n&&<Button variant="secondary" disabled={save.isPending||saved} onClick={()=>{if(!save.isPending&&!saved)save.mutate();}}>{saved?<><Check size={16}/>{tr("План сохранён")}</>:save.isPending?tr("Сохраняем…"):tr("Сохранить месячный план цели")}</Button>}
  </section>}
 </form>;
}
