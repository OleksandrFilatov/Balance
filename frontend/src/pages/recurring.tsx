import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, Pause, Play, Pencil, History,ArrowDownLeft,ArrowUpRight,MoreHorizontal } from "lucide-react";
import {
  useRecurring,
  useRecurringProgress,
  useRecurringMonth,
  useRecurringHistory,
  recurringApi,
  type Rule,
  type RecurringInput,
  type RuleProgress,
} from "@/api/recurring";
import { useAccounts, useCategories, useRefreshFinance, financeKey } from "@/api/queries";
import { ApiError, request } from "@/api/client";
import { formatMoney, normalizeMoney } from "@/lib/money";
import { today } from "@/lib/dates";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ErrorNotice, EmptyState, Loading } from "@/components/feedback";
import { useFinanceUi } from "@/providers/finance-ui";
import { CategoryManagerDialog } from "@/components/category-manager";
import {DeleteRecurring,CancelRecurringPayment} from "@/components/recurring-actions";
import {displayDate,monthName} from "@/lib/dates";
import {berlinToday} from "@/lib/calendar-dates";
import {MoneyMonth,useMoneyMonth} from "@/components/money-month";
import {useMoney,useMoneyPeriod} from "@/api/money";
import {ProgressBar} from "@/components/ui/progress";
const frequency = (): Record<string, string> => ({
  ONCE:tr("Один раз"),
  DAILY: tr("Ежедневно"),
  WEEKLY: tr("Еженедельно"),
  MONTHLY: tr("Ежемесячно"),
  QUARTERLY: tr("Ежеквартально"),
  YEARLY: tr("Ежегодно"),
});
const statuses = (): Record<string, string> => ({
  ACTIVE: tr("Активен"),
  PAUSED: tr("Приостановлен"),
  ARCHIVED: tr("В архиве"),
});
export function RecurringPanel({ compact = false }: { compact?: boolean }) {
  const query=useRecurringMonth(),rules=useRecurring();
  const [shown,setShown]=useState(20),[confirm,setConfirm]=useState<Rule|null>(null);
  const events=query.data?.events.slice(0,compact?6:shown)??[];
  const dates=[...new Set(events.map(e=>e.date))];
  const row=(e:NonNullable<typeof query.data>["events"][number])=>{
    const rule=rules.data?.find(r=>r.id===e.templateId),home=rule?.template.type==="EXPENSE"&&rule.template.scope==="HOUSEHOLD";
    const actionable=rule?.nextDate===e.date&&e.date<=(query.data?.asOf??berlinToday());
    return <div key={e.templateId+e.date} className="month-planned-row"><span className={"month-planned-icon "+(e.type==="INCOME"?"income":"expense")}>{e.type==="INCOME"?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div><strong>{categoryName(e)}</strong><small>{e.type==="INCOME"?tr("Ожидаемый доход"):home?tr("В составе коммуналки"):tr("Регулярный расход")}{e.overdue?tr(" · пора оплатить"):""}</small></div><b>{e.type==="INCOME"?"+":"−"}{formatMoney(e.amount,e.currency)}</b>{home?<Link className="text-link" to={"/household?month="+e.date.slice(0,7)}>{tr("К оплате месяца →")}</Link>:actionable&&rule?<Button size="small" variant="secondary" onClick={()=>setConfirm(rule)}>{e.type==="INCOME"?tr("Записать доход"):tr("Оплатить")}</Button>:<span className="soft-badge">{tr("Запланировано")}</span>}</div>;
  };
  return <Card className="goal-detail recurring-upcoming recurring-month-panel">
    <div className="panel-heading"><div><span className="eyebrow-label">{tr("План на текущий месяц")}</span><h2>{monthName(query.data?.month??berlinToday().slice(0,7))}</h2><p className="form-note">{tr("Ежемесячные платежи выполняются по дате, если хватает свободных денег. Разовые можно оплатить вручную.")}</p></div><span className="month-plan-mark"><CalendarClock size={23}/></span></div>
    {query.error?<ErrorNotice error={query.error} retry={()=>void query.refetch()}/>:!query.data?<Loading/>:<>
      {dates.length?<div className="month-planned-list">{dates.map(date=><section key={date} className="month-planned-day"><h3><span>{displayDate(date)}</span>{date===query.data!.asOf&&<small>{tr("Сегодня")}</small>}</h3>{events.filter(e=>e.date===date).map(row)}</section>)}</div>:<p className="quiet-empty">{tr("В этом месяце нет запланированных платежей и доходов.")}</p>}
      {query.data.events.length>shown&&!compact&&<Button variant="secondary" onClick={()=>setShown(shown+20)}>{tr("Показать ещё")}</Button>}
      {!!query.data.overdue.length&&<details className="daily-details"><summary>{tr("Не оплачено раньше ·")}{" "}{query.data.overdue.length}</summary><p className="form-note">{tr("Эти обязательства сохранены отдельно и не исчезают при смене месяца.")}</p>{query.data.overdue.slice(0,20).map(row)}</details>}
      {query.data.truncated&&<p role="alert" className="form-note">{tr("Показаны первые 5000 событий месяца.")}</p>}
    </>}
    {confirm&&<ConfirmRecurring rule={confirm} onClose={()=>setConfirm(null)}/>}
  </Card>;
}

export function PersonalExpensesPage() { return <RecurringPage personalOnly/>; }

function PersonalExpenseSummary({month}:{month:string}) {
  const query=useMoneyPeriod("EUR",month);
  if(query.error)return <ErrorNotice error={query.error} retry={()=>void query.refetch()}/>;
  if(!query.data)return <Loading/>;
  if(query.data.mode==="HISTORY")return <p className="form-note">{tr("Это прошлый месяц. Фактические оплаты каждого платежа сохранены в его истории.")}</p>;
  const part=query.data.overview.breakdown.personal;
  return <Card className="personal-expenses-summary"><div><span>{tr("Личные платежи за")}{" "}{monthName(month)}</span><strong data-testid="personal-payments-due">{part.complete?"":tr("от ")}{formatMoney(part.amount)}</strong></div><p>{tr("Банк, проезд, связь и другие личные платежи. Уже оплаченные суммы повторно не вычитаются.")}{query.data.mode==="CURRENT"?tr(" Просроченное тоже учтено."):tr(" Это план, а не списание денег.")}</p></Card>;
}

export function RecurringPage({personalOnly=false}:{personalOnly?:boolean}) {
  const rules=useRecurring(),upcoming=useRecurringMonth(),refresh=useRefreshFinance(),{notify}=useFinanceUi();
  const [params,setParams]=useSearchParams(),historyId=params.get("history");
  const linked=useQuery({queryKey:[...financeKey,"recurring-history-source",historyId],enabled:!!historyId,queryFn:()=>request<Rule>("/recurring/"+historyId+"?includeDeleted=true")});
  const [edit,setEdit]=useState<Rule|"new"|null>(null),[confirm,setConfirm]=useState<Rule|null>(null),[history,setHistory]=useState<Rule|null>(null);
  const [archived,setArchived]=useState(false),[view,setView]=useState<"rules"|"upcoming">("rules");
  const month=useMoneyMonth();
  const progressMonth=personalOnly?month.month:berlinToday().slice(0,7),progress=useRecurringProgress(progressMonth);
  const [manageId,setManageId]=useState<string|null>(null);
  const managed=rules.data?.find(r=>r.id===manageId),manageTrigger=useRef<HTMLButtonElement|null>(null);
  const toggle=useMutation({mutationFn:(r:Rule)=>recurringApi.update(r,r.template,r.status==="ACTIVE"?"PAUSED":"ACTIVE"),onSuccess:async()=>{await refresh();notify(tr("Платёж обновлён"));},retry:false});
  const visible=(rules.data??[]).filter(r=>(!personalOnly||r.template.type==="EXPENSE"&&r.template.scope==="PERSONAL")&&(archived?r.status==="ARCHIVED":r.status!=="ARCHIVED")).sort((a,b)=>(a.status==="ACTIVE"?0:1)-(b.status==="ACTIVE"?0:1)||(a.nextDate??"9999").localeCompare(b.nextDate??"9999"));
  const shownHistory=history??linked.data;
  return <>
    <PageHeading title={personalOnly?tr("Личные расходы"):tr("Регулярные платежи")} description={personalOnly?tr("Банк, проезд и связь. Ежемесячные платежи оплачиваются автоматически."):tr("Ежемесячные — автоматически. Разовые — по вашему подтверждению.")} action={personalOnly?tr("Добавить личный платёж"):tr("Новый платёж")} onAction={()=>setEdit("new")}/>
    {personalOnly&&<><MoneyMonth {...month} onChange={month.setMonth}/><PersonalExpenseSummary month={month.month}/></>}
    <div className="recurring-page-toolbar">{!personalOnly&&<div className="period-segments" role="group" aria-label={tr("Вид регулярных платежей")}><Button variant="ghost" aria-pressed={view==="rules"} onClick={()=>setView("rules")}>{tr("Мои платежи")}</Button><Button variant="ghost" aria-pressed={view==="upcoming"} onClick={()=>setView("upcoming")}>{tr("Ближайшие")}</Button></div>}
    {view==="rules"&&<label className="checkbox-field"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)}/>{tr("Архив")}</label>}</div>
    <ErrorNotice error={toggle.error??linked.error??progress.error}/>
    {view==="upcoming"?<RecurringPanel/>:rules.error?<ErrorNotice error={rules.error} retry={()=>void rules.refetch()}/>:!rules.data?<Loading/>:!visible.length?<Card className="daily-panel"><EmptyState title={archived?tr("В архиве пока пусто"):personalOnly?tr("Пока нет личных платежей"):tr("Добавьте первый регулярный платёж")} description={personalOnly?tr("Добавьте комиссию банка, проездной или личный интернет. Коммуналка и долги останутся в своих разделах."):tr("Например, аренду, подписку или зарплату.")}/></Card>:<div className="recurring-rules-list">
      {visible.map(r=>{
        const monthly=r.template.type==="EXPENSE"&&r.template.scope==="HOUSEHOLD"&&r.currency==="EUR";
        const paid=progress.data?.find(p=>p.id===r.id), settled=paid?.complete&&paid.occurrences!=="0"&&paid.remaining==="0.00";
        const due=!settled&&r.status==="ACTIVE"&&!!r.nextDate&&r.nextDate<=(upcoming.data?.asOf??today());
        const actions=<div className={"recurring-rule-actions"+(personalOnly?" personal-routine-actions":"")}>
          <Button variant="ghost" size={personalOnly?"icon":"small"} title={tr("Изменить платёж")} aria-label={tr("Редактировать расписание: ")+r.template.name} onClick={()=>setEdit(r)}><Pencil size={15}/>{!personalOnly&&tr("Изменить")}</Button>
          <Button variant="ghost" size={personalOnly?"icon":"small"} title={tr("История оплат")} aria-label={tr("История расписания: ")+r.template.name} onClick={()=>setHistory(r)}><History size={16}/>{!personalOnly&&tr("История")}</Button>
          {r.status!=="ARCHIVED"&&<Button variant="ghost" size={personalOnly?"icon":"small"} title={r.status==="ACTIVE"?tr("Приостановить"):tr("Возобновить")} disabled={toggle.isPending} aria-label={(r.status==="ACTIVE"?tr("Приостановить: "):tr("Возобновить: "))+r.template.name} onClick={()=>toggle.mutate(r)}>{r.status==="ACTIVE"?<Pause size={16}/>:<Play size={16}/>}<span className={personalOnly?"sr-only":""}>{r.status==="ACTIVE"?tr("Пауза"):tr("Возобновить")}</span></Button>}
          <DeleteRecurring rule={r} compact={personalOnly} onRemoved={()=>setManageId(null)}/>
        </div>;
        return <Card key={r.id} className="recurring-rule" data-testid="recurring-rule">
          <header className="recurring-rule-heading"><span className={"recurring-rule-icon "+(r.template.type==="INCOME"?"income":"")}><CalendarClock size={22}/></span><div><h2>{categoryName(r.template)}</h2><p>{frequency()[r.template.frequency]} · {r.template.type==="INCOME"?tr("Доход"):r.template.scope==="HOUSEHOLD"?r.template.householdSplit==="EQUAL"?tr("Дом · 50/50"):tr("Дом · по зарплатам"):tr("Личные расходы")}</p></div><strong className="recurring-rule-amount">{r.template.type==="INCOME"?"+":""}{formatMoney(r.template.amount,r.currency)}</strong></header>
          <div className="recurring-rule-meta"><span className={due?"soft-badge bill-due":"soft-badge"}>{settled?r.template.type==="INCOME"?tr("Получено"):tr("Оплачено"):due?r.template.type==="INCOME"?tr("Ожидается поступление"):tr("К оплате"):statuses()[r.status]}</span><span>{settled?monthName(progressMonth):r.nextDate?displayDate(r.nextDate):tr("Платёж завершён")}</span></div>
          {r.lastError&&<p className="warning-text">{r.lastError}</p>}
          <RecurringProgress progress={progress.data?.find(p=>p.id===r.id)} month={progressMonth} income={r.template.type==="INCOME"} failed={!!progress.error}/>
          <div className="recurring-card-footer">{monthly?<Link className="button button-secondary button-small" to={"/household?month="+progressMonth}>{settled?tr("Посмотреть месяц"):tr("Оплатить месяц")}</Link>:due?<Button size="small" onClick={()=>setConfirm(r)}>{r.template.type==="INCOME"?tr("Записать доход"):tr("Оплатить")}</Button>:<span className="recurring-payment-hint">{r.status==="ACTIVE"?tr("Оплата по дате"):tr("Расписание не активно")}</span>}
          {!personalOnly&&<Button variant="ghost" size="icon" aria-label={tr("Действия платежа: ")+r.template.name} title={tr("Действия")} onClick={event=>{manageTrigger.current=event.currentTarget;setManageId(r.id);}}><MoreHorizontal size={19}/></Button>}</div>{personalOnly&&actions}
        </Card>;
      })}
    </div>}
    {managed&&<Dialog open title={managed.template.name} onClose={()=>setManageId(null)} returnFocusRef={manageTrigger} description={tr("Управление расписанием и история оплат.")}>
      {managed.template.description&&<p className="form-note">{managed.template.description}</p>}
      <div className="recurring-management">
        <Button variant="secondary" aria-label={tr("Редактировать расписание: ")+managed.template.name} onClick={()=>{setManageId(null);setEdit(managed);}}><Pencil size={16}/>{tr("Изменить платёж")}</Button>
        <Button variant="secondary" aria-label={tr("История расписания: ")+managed.template.name} onClick={()=>{setManageId(null);setHistory(managed);}}><History size={16}/>{tr("История оплат")}</Button>
        {managed.status!=="ARCHIVED"&&<Button variant="secondary" aria-label={(managed.status==="ACTIVE"?tr("Приостановить: "):tr("Возобновить: "))+managed.template.name} disabled={toggle.isPending} onClick={()=>toggle.mutate(managed)}>{managed.status==="ACTIVE"?<Pause size={16}/>:<Play size={16}/>} {managed.status==="ACTIVE"?tr("Приостановить"):tr("Возобновить")}</Button>}
        <DeleteRecurring rule={managed} onRemoved={()=>setManageId(null)}/>
      </div><ErrorNotice error={toggle.error}/>
    </Dialog>}
    {edit&&<RecurringEditor personalOnly={personalOnly} rule={edit==="new"?undefined:edit} onClose={()=>setEdit(null)}/>}
    {confirm&&<ConfirmRecurring rule={confirm} onClose={()=>setConfirm(null)}/>}
    {shownHistory&&<RecurringHistory rule={shownHistory} onClose={()=>{setHistory(null);setParams(previous=>{const next=new URLSearchParams(previous);next.delete("history");return next;}, {replace:true});}}/>}
  </>;
}

function RecurringProgress({progress,month,income,failed}:{progress?:RuleProgress;month:string;income:boolean;failed:boolean}){
 const caption=!progress?failed?tr("Не удалось загрузить оплаты"):tr("Загружаем оплаты…"):!progress.complete?tr("Нужны зарплаты для расчёта доли"):progress.occurrences==="0"?tr("Нет платежей за этот месяц"):(income?tr("Получено "):tr("Оплачено "))+formatMoney(progress.paid,progress.currency)+tr(" из ")+formatMoney(progress.planned!,progress.currency);
 return <div className="recurring-payment-progress" data-testid="recurring-progress"><div><span>{caption}</span>{progress?.percent!==null&&progress?.percent!==undefined&&<b>{new Intl.NumberFormat(getLocale(),{maximumFractionDigits:0}).format(Number(progress.percent))}%</b>}</div><ProgressBar value={progress?.percent??null} label={caption} tone={progress?.percent!==null&&Number(progress?.percent)>=100?"success":"accent"}/><small>{monthName(month)}{progress?.personalShare?tr(" · моя доля"):""}</small></div>;
}

function ConfirmRecurring({
  rule,
  onClose,
}: {
  rule: Rule;
  onClose: () => void;
}) {
  const refresh = useRefreshFinance(),
    { notify } = useFinanceUi(),
    guard = useRef(false);
  const [actual, setActual] = useState(today());
  const mutation = useMutation({
    mutationFn: () => recurringApi.confirm(rule, actual),
    retry: false,
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    try {
      await mutation.mutateAsync();
      await refresh();
      notify(tr("Факт проведён"));
      onClose();
    } catch {
    } finally {
      guard.current = false;
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      busy={mutation.isPending}
      title={tr("Подтвердить фактическую операцию?")}
      description={
        tr("Расписание: ") +
        rule.template.name +
        tr(" · дата по плану ") +
        rule.nextDate +
        tr(". Повтор этой даты не создаст второе движение денег.")
      }
    >
      <form className="form-stack" onSubmit={submit}>
        <strong>{formatMoney(rule.template.amount, rule.currency)}</strong>
        <Field label={tr("Фактическая дата операции")}>
          <Input
            type="date"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            max={today()}
            required
            disabled={mutation.isPending}
          />
        </Field>
        <ErrorNotice error={mutation.error} />
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? tr("Проводим…") : tr("Провести операцию")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function RecurringHistory({
  rule,
  onClose,
}: {
  rule: Rule;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0),
    query = useRecurringHistory(rule.id, page);
  return (
    <Dialog
      open
      onClose={onClose}
      title={tr("История: ") + rule.template.name}
      description={tr("Только фактически проведённые операции. Изменение шаблона не переписывает историю.")}
    >
      {query.error ? (
        <ErrorNotice error={query.error} />
      ) : !query.data ? (
        <Loading />
      ) : !query.data.content.length ? (
        <p>{tr("Выполнений пока нет.")}</p>
      ) : (
        <>
          <div className="savings-history">
            {query.data.content.map((e) => (
              <div key={e.id}>
                <div>
                  <strong>{e.transaction.description}</strong>
                  <p>{" "}{tr("По плану:")}{" "}{e.occurrenceDate}
                    <br />{" "}{tr("Фактически:")}{" "}{e.transaction.operationDate}
                  </p>
                  <small>
                    {e.mode === "AUTOMATIC"
                      ? tr("Автоматически")
                      : tr("Подтверждено вручную")}{" "}
                    · {new Date(e.createdAt).toLocaleString(getLocale())}
                  </small>
                </div>
                <span>
                  {formatMoney(e.transaction.amount, e.transaction.currency)}
                  <CancelRecurringPayment rule={rule} run={e}/>
                </span>
              </div>
            ))}
          </div>
          <div className="pagination">
            <Button
              variant="secondary"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >{" "}{tr("Назад")}{" "}</Button>
            <span>{page + 1}</span>
            <Button
              variant="secondary"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * 50 >= query.data.totalElements}
            >{" "}{tr("Далее")}{" "}</Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
export function RecurringEditor({defaultScope="PERSONAL",defaultCategoryId,personalOnly=false,rule,onClose}:{rule?:Rule;defaultScope?:"PERSONAL"|"HOUSEHOLD";defaultCategoryId?:string;personalOnly?:boolean;onClose:()=>void}){
 const accounts=useAccounts(),categories=useCategories(),money=useMoney(),refresh=useRefreshFinance(),{notify}=useFinanceUi();
 const source=useQuery({queryKey:[...financeKey,"recurring-editor-source",rule?.id],enabled:!!rule,queryFn:({signal})=>request<Rule>("/recurring/"+rule!.id,{signal})});
 const latest=source.data;
 // Category deletion only repoints references. Rebase that change, never another user's edits.
 const categoryOnly=!!rule&&!!latest&&latest.template.categoryId!==rule.template.categoryId&&latest.status===rule.status&&latest.nextDate===rule.nextDate&&JSON.stringify({...latest.template,categoryId:null})===JSON.stringify({...rule.template,categoryId:null});
 const saveRule=categoryOnly?latest:rule;
 const stale=!!rule&&!!latest&&latest.version!==rule.version&&!categoryOnly;
 const [type,setType]=useState<"INCOME"|"EXPENSE">(personalOnly?"EXPENSE":rule?.template.type??"EXPENSE"),[mode,setMode]=useState(rule?.template.frequency==="ONCE"?"once":rule?.template.endDate?"limited":"regular"),[interval,setInterval]=useState(rule?.template.frequency==="ONCE"?"MONTHLY":rule?.template.frequency??"MONTHLY");
 const [account,setAccount]=useState<string|null>(null),[category,setCategory]=useState<string|null>(null),[first,setFirst]=useState(rule?.template.firstDate??berlinToday()),[manage,setManage]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState<Error|null>(null);
 const guard=useRef(false),available=accounts.data?.filter(a=>a.active||a.id===rule?.template.accountId)??[],chosen=account??rule?.template.accountId??available.find(a=>a.id===money.data?.defaultAccountId)?.id??(available.length===1?available[0].id:"");
 const options=categories.data?.filter(c=>c.type===type&&(c.active||c.id===saveRule?.template.categoryId)&&c.id!=="00000000-0000-0000-0003-000000000001")??[];
 if(saveRule?.template.type===type&&!options.some(c=>c.id===saveRule.template.categoryId))options.push({id:saveRule.template.categoryId,name:tr("Без категории"),type,active:true,version:0});
 const defaultCategory=saveRule?.template.type===type?saveRule.template.categoryId:defaultCategoryId??(type==="INCOME"?"00000000-0000-0000-0002-000000000001":"00000000-0000-0000-0001-000000000009"),chosenCategory=options.find(c=>c.id===category)?.id??options.find(c=>c.id===defaultCategory)?.id??(options.length===1?options[0].id:"");
 const automatic=mode!=="once"&&(interval==="MONTHLY"||rule?.template.automatic===true);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(guard.current||uncertain||stale||source.isFetching)return;guard.current=true;setBusy(true);setError(null);
  try{const data=new FormData(e.currentTarget),body:RecurringInput={name:String(data.get("name")).trim(),description:String(data.get("description")??""),type,amount:normalizeMoney(String(data.get("amount"))),accountId:chosen,categoryId:chosenCategory,scope:personalOnly?"PERSONAL":type==="INCOME"?rule?.template.scope??"PERSONAL":String(data.get("scope")??defaultScope) as "PERSONAL"|"HOUSEHOLD",frequency:mode==="once"?"ONCE":interval,firstDate:first,endDate:mode==="limited"?String(data.get("endDate"))||null:null,automatic,householdSplit:rule?.template.householdSplit??"EQUAL",householdGroup:rule?.template.householdGroup};
   if(saveRule)await recurringApi.update(saveRule,body,String(data.get("status")??saveRule.status));else await recurringApi.create(body);
   await refresh();notify(tr("Платёж сохранён"));onClose();
  }catch(cause){setError(cause as Error);if(cause instanceof ApiError&&(cause.status===0||cause.status>=500)){setUncertain(true);void refresh();}}
  finally{guard.current=false;setBusy(false);}
 }
 return <Dialog open onClose={onClose} busy={busy} title={rule?tr("Изменить платёж"):personalOnly?tr("Новый личный платёж"):tr("Новый платёж")} description={tr("Дата уже заполнена. Укажите сумму и выберите, как часто платить.")}>
  <form className="form-stack recurring-editor-simple" onSubmit={submit}><fieldset className="form-stack" disabled={busy||uncertain}>
   {!personalOnly&&<div className="segmented" role="group" aria-label={tr("Тип регулярной операции")}><Button variant="ghost" aria-pressed={type==="EXPENSE"} onClick={()=>{setType("EXPENSE");setCategory(null);}}>{tr("Расход")}</Button><Button variant="ghost" aria-pressed={type==="INCOME"} onClick={()=>{setType("INCOME");setCategory(null);}}>{tr("Доход")}</Button></div>}
   <Field label={personalOnly?tr("За что плачу"):tr("Название платежа")}><Input name="name" defaultValue={rule?.template.name} required maxLength={100} placeholder={personalOnly?tr("Банк, проезд или связь"):tr("Например, интернет")}/></Field>
   <Field label={tr("Сумма")}><Input name="amount" defaultValue={rule?.template.amount} inputMode="decimal" required/></Field>
   <div className="segmented" role="group" aria-label={tr("Срок платежа")}>{[["regular",tr("Регулярный")],["once",tr("Разовый")],["limited",tr("На срок")]].map(([value,label])=><Button variant="ghost" key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</Button>)}</div>
   <div className="form-grid">{mode!=="once"&&<Field label={personalOnly?tr("Как часто"):tr("Периодичность")}><Select value={interval} onChange={e=>setInterval(e.target.value)}>{Object.entries(frequency()).filter(([value])=>value!=="ONCE").map(([value,label])=><option value={value} key={value}>{label}</option>)}</Select></Field>}
    <Field label={rule?tr("Дата начала расписания"):personalOnly?tr("Первая оплата"):tr("Дата первого выполнения")}><Input name="firstDate" type="date" value={first} onChange={e=>setFirst(e.target.value)} min="0001-01-01" max="9999-12-31" required/></Field>
   </div>
   {mode==="limited"&&<Field label={tr("Платить до")}><Input name="endDate" type="date" min={first} max="9999-12-31" defaultValue={rule?.template.endDate??""} required/></Field>}
   {automatic&&<p className="routine-auto-note"><CalendarClock size={15}/>{tr("Автоматически в дату оплаты. Если свободных денег не хватит — платёж подождёт пополнения.")}</p>}
   {available.length===1?<input type="hidden" name="accountId" value={chosen}/>:<Field label={personalOnly?tr("Откуда оплачивать"):tr("Счёт")}><Select value={chosen} onChange={e=>setAccount(e.target.value)} required><option value="">{tr("Выберите счёт")}</option>{available.map(a=><option value={a.id} key={a.id}>{categoryName(a)} · {a.currency}</option>)}</Select></Field>}
   <Field label={tr("Категория")}><Select value={chosenCategory} onChange={e=>setCategory(e.target.value)} required><option value="">{tr("Выберите категорию")}</option>{options.map(c=><option value={c.id} key={c.id}>{categoryName(c)}</option>)}</Select></Field>
   <details className="personal-payment-options"><summary>{tr("Описание и настройки")}</summary><div className="form-stack"><Field label={tr("Описание")}><Textarea name="description" defaultValue={rule?.template.description??""} rows={2} maxLength={1500}/></Field><Button variant="ghost" size="small" onClick={()=>setManage(true)}>{tr("Управлять категориями")}</Button>
    {!personalOnly&&type==="EXPENSE"&&<Field label={tr("Назначение")}><Select name="scope" defaultValue={rule?.template.scope??defaultScope}><option value="PERSONAL">{tr("Личное")}</option><option value="HOUSEHOLD">{tr("Домашнее")}</option></Select></Field>}
    {rule&&<Field label={tr("Состояние")}><Select name="status" defaultValue={rule.status}><option value="ACTIVE">{tr("Активен")}</option><option value="PAUSED">{tr("Приостановлен")}</option><option value="ARCHIVED">{tr("В архиве")}</option></Select></Field>}
   </div></details>
  </fieldset><ErrorNotice error={error??accounts.error??categories.error??source.error}/>{stale&&<p role="alert" className="warning-text">{tr("Платёж изменился в другом окне. Закройте форму и откройте актуальный платёж перед сохранением.")}</p>}{uncertain&&<p className="warning-text">{tr("Проверьте список перед повторным созданием: ответ на сохранение мог потеряться.")}</p>}<div className="dialog-footer"><Button variant="secondary" disabled={busy} onClick={onClose}>{tr("Отмена")}</Button><Button type="submit" disabled={busy||uncertain||!chosen||stale||!!rule&&source.isFetching}>{busy?tr("Сохраняем…"):tr("Сохранить платёж")}</Button></div></form>
  {manage&&<CategoryManagerDialog type={type} close={()=>setManage(false)}/>}
 </Dialog>;
}
