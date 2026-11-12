import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Calculator, PiggyBank, Target,RefreshCw } from "lucide-react";
import { useAdviceCalculation,useSavingsAdvice, type AdviceInput, type SavingsAdvice } from "@/api/savings-advice";
import { berlinToday, calendarLabel } from "@/lib/calendar-dates";
import { formatMoney, normalizeMoney, cents } from "@/lib/money";
import { monthName } from "@/lib/dates";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Field, Input, Select } from "./ui/input";
import { ErrorNotice, Loading } from "./feedback";

export function SavingsAdviser() {
  const month = berlinToday().slice(0, 7);
  return <Adviser key={month} month={month}/>;
}

function Adviser({ month }: { month: string }) {
  const q = useSavingsAdvice(month), [editing, setEditing] = useState<SavingsAdvice|null>(null), [details, setDetails] = useState(false);
  const data = q.data;
  // Do not keep displaying a previously valid recommendation when a fresh request fails.
  return <Card className="savings-adviser" data-testid="savings-adviser">
    <div className="adviser-heading"><span className="adviser-icon"><PiggyBank size={21}/></span><div><span className="eyebrow-label">{tr("Помощник по деньгам")}</span><h2>{tr("Сколько можно отложить?")}</h2></div><span className="adviser-month">{monthName(month)}</span></div>
    {q.error ? <><ErrorNotice error={q.error} retry={() => void q.refetch()}/><Button variant="secondary" size="small" onClick={() => q.setInput({ ...q.input, goalId: null })}>{tr("Сбросить выбор цели")}</Button></> : !data ? <Loading label={tr("Считаем свободные деньги")}/> : <>
      <div className="adviser-body"><div className="adviser-estimate" aria-live="polite">
        {data.ready ? <><span>{tr("Можно отложить сейчас")}</span><strong data-testid="advice-available">{formatMoney(data.available!)}</strong><p>{tr("Обязательства, накопления и деньги на жизнь уже учтены.")}</p></> : <><strong className="adviser-prompt">{tr("Оставим на жизнь.")}<br/>{tr("Остальное — на цели.")}</strong><p>{tr("Укажите, сколько вам нужно до конца месяца. Посчитаем по деньгам, которые уже есть.")}</p></>}
      </div><div className="adviser-actions"><Button size="small" onClick={() => setEditing(data)}><Calculator size={16}/>{q.input.living === null ? tr("Открыть калькулятор") : tr("Изменить расчёт")}</Button>{data.ready && <button className="adviser-explain" onClick={() => setDetails(true)}>{tr("Почему столько?")}{" "}<ArrowUpRight size={14}/></button>}</div></div>
      {data.missing.includes("OBLIGATIONS") && <Link className="warning-text" to="/household">{tr("Уточните зарплаты и суммы коммуналки — пока точную рекомендацию дать нельзя →")}</Link>}
      {data.missing.includes("INCOME") && q.input.living !== null && <p className="warning-text">{tr("Доход за этот месяц ещё не записан. Добавьте его или подтвердите расчёт только по текущему балансу.")}</p>}
      {data.shortage !== null && cents(data.shortage) > 0n && <p className="warning-text" data-testid="advice-shortage">{tr("На указанный план не хватает")}{" "}{formatMoney(data.shortage)}{tr(". Пока лучше не откладывать.")}</p>}
      {data.underfunded && <Link className="warning-text" to="/savings">{tr("На одном из счетов не хватает денег для уже созданного резерва. Проверьте накопления →")}</Link>}
      {data.goal && <div className="adviser-goal"><span className="adviser-goal-icon"><Target size={18}/></span><div><span>{tr("На цель «")}{categoryName(data.goal)}»</span><strong data-testid="advice-goal-amount">{formatMoney(data.goal.recommended)}</strong><small>{cents(data.goal.otherPlans) > 0n ? tr("Учтены взносы на другие цели. ") : ""}{data.goal.requiredMonthly !== null ? tr("С учётом выбранного срока.") : tr("В пределах оставшейся суммы цели.")}</small></div><Link to={"/savings/" + data.goal.id} aria-label={tr("Открыть цель «") + data.goal.name + "»"}><ArrowUpRight size={19}/></Link></div>}
      {data.ready && !data.goals.length && <Link className="adviser-explain" to="/savings">{tr("Создать цель для накоплений")}{" "}<ArrowUpRight size={14}/></Link>}
      <p className="adviser-footnote">{tr("Это рекомендация. Деньги не списываются и не резервируются.")}</p>
      {details && <AdviceDetails data={data} onClose={() => setDetails(false)}/>}
    </>}
    {editing && <AdviceEditor data={editing} input={q.input} onClose={() => setEditing(null)} onApply={value=>{q.setInput(value);setEditing(null);}}/>}
  </Card>;
}

function AdviceEditor({ data, input, onApply, onClose }: { data: SavingsAdvice; input: AdviceInput; onApply: (value: AdviceInput) => void; onClose: () => void }) {
  const [living,setLiving]=useState(input.living??"0"),[goalId,setGoalId]=useState(input.goalId??data.goals[0]?.id??"");
  const parsed=useMemo(()=>{
    if(!living.trim())return {value:null,error:tr("Введите сумму на жизнь. Если запас не нужен, укажите 0.")};
    try{const amount=normalizeMoney(living,false);if(cents(amount)<0n)throw new Error(tr("Сумма на жизнь не может быть отрицательной."));return {value:{living:amount,goalId:goalId||null,useBalanceOnly:true} satisfies AdviceInput,error:null};}
    catch(cause){return {value:null,error:(cause as Error).message};}
  },[living,goalId]);
  const [settled,setSettled]=useState(parsed.value);
  useEffect(()=>{const timer=window.setTimeout(()=>setSettled(parsed.value),300);return()=>window.clearTimeout(timer);},[parsed.value]);
  const matches=JSON.stringify(parsed.value)===JSON.stringify(settled),preview=useAdviceCalculation(data.month,parsed.value&&matches?settled:null);
  const waiting=!!parsed.value&&(!matches||preview.isFetching||preview.isPending);
  // Never display a recommendation for an earlier input or after a failed refresh.
  const result=parsed.value&&matches&&!preview.isFetching&&!preview.error?preview.data:undefined;
  const context=preview.data??data,choices=preview.data?.goals??data.goals;
  return <Dialog open title={tr("Сколько можно отложить")} description={tr("До конца месяца · ")+monthName(data.month)+tr(". Результат обновляется при вводе.")} onClose={onClose}>
    <div className="live-adviser" data-testid="live-adviser">
      <div className="live-adviser-cash"><span>{tr("На счетах сейчас")}</span><strong data-testid="live-advice-balance">{formatMoney(context.balance)}</strong></div>
      <Field label={tr("Оставить на жизнь, €")}><Input inputMode="decimal" value={living} onChange={e=>setLiving(e.target.value)} onFocus={e=>e.currentTarget.select()} maxLength={22} placeholder={tr("Например, 200")} data-autofocus aria-invalid={!!parsed.error} aria-describedby="advice-living-help"/></Field>
      <p id="advice-living-help" className={parsed.error?"live-adviser-validation":"live-adviser-help"} role={parsed.error?"alert":undefined}>{parsed.error??tr("На будущие покупки. Обязательные платежи и накопления уже учтены отдельно.")}</p>
      <section className="live-adviser-result" data-state={waiting?"loading":result?.ready?"ready":"incomplete"} aria-live="polite" aria-atomic="true" aria-busy={waiting}>
        <span>{tr("Можно отложить сейчас")}</span>
        {waiting?<div className="live-adviser-pending" role="status"><RefreshCw size={18}/>{tr("Считаем…")}</div>:result?.ready?<strong data-testid="live-advice-available">{formatMoney(result.available!)}</strong>:<strong className="live-adviser-empty">{parsed.error?tr("Укажите сумму"):preview.error?tr("Расчёт недоступен"):tr("Уточните платежи")}</strong>}
        {result?.ready&&<p>{cents(result.shortage!)>0n?tr("На обязательные платежи и жизнь не хватает ")+formatMoney(result.shortage!)+tr(". Сейчас лучше не откладывать."):tr("Столько останется после всех указанных затрат.")}</p>}
        {!parsed.error&&result?.missing.includes("OBLIGATIONS")&&<p>{tr("Не все обязательные платежи известны.")}{" "}<Link to="/household" onClick={onClose}>{tr("Уточнить коммуналку →")}</Link></p>}
      </section>
      <details className="live-adviser-explanation"><summary>{tr("Как получилась сумма")}</summary><dl className="adviser-breakdown live-adviser-breakdown"><div><dt>{tr("Деньги на счетах")}</dt><dd>{formatMoney(context.balance)}</dd></div><div><dt>{tr("Мои обязательные платежи")}</dt><dd>{context.unknownObligations!=="0"?tr("Нужно уточнить"):"− "+formatMoney(context.mandatory)}</dd></div><div><dt>{tr("Уже в накоплениях")}</dt><dd>− {formatMoney(context.reserved)}</dd></div><div><dt>{tr("Оставить на жизнь")}</dt><dd>{parsed.value?"− "+formatMoney(parsed.value.living!):"—"}</dd></div></dl></details>
      {!!choices.length&&<Field label={tr("На какую цель")}><Select value={goalId} onChange={e=>setGoalId(e.target.value)}><option value="">{tr("Выбрать ближайшую цель")}</option>{choices.map(g=><option key={g.id} value={g.id}>{categoryName(g)}</option>)}</Select></Field>}
      {result?.goal&&<div className="live-adviser-goal"><Target size={18}/><div><span>{tr("На цель «")}{categoryName(result.goal)}»</span><strong data-testid="live-advice-goal">{formatMoney(result.goal.recommended)}</strong><small>{tr("Осталось накопить")}{" "}{formatMoney(result.goal.remaining)}{cents(result.goal.otherPlans)>0n?tr(". На другие цели учтено ")+formatMoney(result.goal.otherPlans):""}.</small></div></div>}
      {result?.underfunded&&<p className="warning-text">{tr("На одном из счетов не хватает денег для уже созданных накоплений.")}{" "}<Link to="/savings" onClick={onClose}>{tr("Проверить →")}</Link></p>}
      <ErrorNotice error={parsed.value&&matches?preview.error:null} retry={()=>void preview.refetch()}/>
      {preview.error&&<Button variant="ghost" size="small" onClick={()=>setGoalId("")}>{tr("Сбросить выбор цели")}</Button>}
      <p className="live-adviser-footnote">{tr("Ожидаемая зарплата не прибавляется. Расчёт не списывает деньги и не пополняет цель.")}</p>
      <div className="dialog-footer"><Button variant="secondary" onClick={onClose}>{tr("Закрыть")}</Button><Button disabled={!parsed.value||waiting||!!preview.error||!result} onClick={()=>parsed.value&&onApply(parsed.value)}>{tr("Готово")}</Button></div>
    </div>
  </Dialog>;
}

function AdviceDetails({ data, onClose }: { data: SavingsAdvice; onClose: () => void }) {
  return <Dialog open title={tr("Почему столько можно отложить")} description={tr("Полученный доход уже входит в баланс. Второй раз мы его не прибавляем.")} onClose={onClose}>
    <dl className="adviser-breakdown"><div><dt>{tr("На счетах сейчас")}</dt><dd>{formatMoney(data.balance)}</dd></div><div><dt>{tr("Мои неоплаченные обязательства")}</dt><dd>− {formatMoney(data.mandatory)}</dd></div><div><dt>{tr("Уже зарезервировано на цели")}</dt><dd>− {formatMoney(data.reserved)}</dd></div><div><dt>{tr("Оставить на жизнь")}</dt><dd>− {formatMoney(data.living!)}</dd></div><div className="adviser-breakdown-total"><dt>{tr("Можно отложить сейчас")}</dt><dd>{formatMoney(data.available!)}</dd></div></dl>
    {!!data.deductions.length && <details className="adviser-obligations"><summary>{tr("Какие обязательства учтены")}</summary><div className="deductions-list">{data.deductions.map((d, i) => <Link key={i} to={d.href} onClick={onClose}><span>{categoryName(d)}<small>{calendarLabel(d.date)}</small></span><b>{d.amount === null ? tr("Уточните сумму") : formatMoney(d.amount)}</b></Link>)}</div></details>}
    {data.goal && <section className="adviser-forecast"><h3>{tr("План для цели «")}{categoryName(data.goal)}»</h3><dl className="adviser-breakdown"><div><dt>{tr("Осталось накопить")}</dt><dd>{formatMoney(data.goal.remaining)}</dd></div><div><dt>{tr("Ещё запланировано на другие цели в этом месяце")}</dt><dd>{formatMoney(data.goal.otherPlans)}</dd></div><div><dt>{tr("Рекомендуемый взнос на эту цель")}</dt><dd>{formatMoney(data.goal.recommended)}</dd></div>{data.goal.requiredMonthly !== null && <div><dt>{tr("Нужно в месяц для выбранного срока")}</dt><dd>{formatMoney(data.goal.requiredMonthly)}</dd></div>}</dl>
      {data.goal.estimatedDate && <p className="form-note">{tr("Если повторять такой взнос каждый месяц, расчётная дата достижения —")}{" "}{calendarLabel(data.goal.estimatedDate)}{tr(". Доходы и расходы могут измениться; это не гарантия.")}</p>}
      {!data.goal.feasible && <p className="warning-text">{tr("При таком взносе цель пока не укладывается в выбранный срок или для неё не остаётся свободных денег.")}</p>}
    </section>}
    <Button variant="secondary" onClick={onClose}>{tr("Понятно")}</Button>
  </Dialog>;
}
