import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2, ChevronRight } from "lucide-react";
import type { Payment } from "@/api/debts";
import { SimpleDebtForm } from "@/components/simple-debt-form";
import {DebtMonthProgress} from "@/components/debt-month-progress";
import {DebtCompactSchedule} from "@/components/debt-compact-schedule";
import {ProgressBar} from "@/components/ui/progress";
import {CollectionPages} from "@/components/collection-tools";
import {
  useDebts,
  useDebt,
  useDebtHistory,
  useDebtOverview,
  debtApi,
  type Debt,
  type Terms,
  useDebtPlan,
} from "@/api/debts";
import { useAccounts, useRefreshFinance } from "@/api/queries";
import { ApiError } from "@/api/client";
import { formatMoney, normalizeMoney, cents } from "@/lib/money";
import { today } from "@/lib/dates";
import {calendarLabel} from "@/lib/calendar-dates";
import {berlinToday} from "@/lib/calendar-dates";
import {compareDebtPaymentDates} from "@/lib/debt-order";
import { useFinanceUi } from "@/providers/finance-ui";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, EmptyState, Loading } from "@/components/feedback";
type Edit = { debt?: Debt; pay?: boolean };
function DebtTotal() {
  const q = useDebtOverview();
  return q.error ? (
    <ErrorNotice error={q.error} retry={() => void q.refetch()} />
  ) : !q.data ? (
    <Loading />
  ) : (
    <Card className="daily-total debt-simple-total">
      <span>{tr("Всего осталось выплатить · EUR")}</span>
      <strong data-testid="debt-total">{formatMoney(q.data.remaining)}</strong>
      <p className="form-note">{q.data.activeDebts}{" "}{tr("активных долгов")}</p>
    </Card>
  );
}
const status = (s: string) =>
  ({ ACTIVE: tr("Активен"), CLOSED: tr("Погашен"), ARCHIVED: tr("В архиве") })[s] ?? s;
function Progress({ debt }: { debt: Debt }) {
  return <ProgressBar value={debt.progress} label={tr("Погашено")} caption tone={Number(debt.progress)>=100?"success":"accent"}/>;
}
export function DebtsPage() {
  const debts = useDebts();
  const [edit, setEdit] = useState<Edit | null>(null),
    [archived, setArchived] = useState(false),[page,setPage]=useState(0);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const debtActionRef = useRef<HTMLButtonElement>(null);
  const inspected = debts.data?.find((debt) => debt.id === inspectedId);
  const todayInBerlin=berlinToday();
  const rows=(debts.data??[]).filter(d=>archived?d.status!=="ACTIVE":d.status==="ACTIVE").sort(compareDebtPaymentDates);
  const pages=Math.ceil(rows.length/12),safePage=Math.min(page,Math.max(0,pages-1));
  return (
    <>
      <PageHeading
        title={tr("Долги")}
        description={tr("Ближайшие платежи — первыми.")}
        action={tr("Новый долг")}
        onAction={() => setEdit({})}
      />
      <DebtTotal />
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => {setArchived(e.target.checked);setPage(0);}}
        />{" "}{tr("Показать архив")}{" "}</label>
      {debts.error ? (
        <ErrorNotice error={debts.error} />
      ) : !debts.data ? (
        <Loading />
      ) : !rows.length ? (
        <Card>
          <EmptyState
            title={tr("Обязательства под контролем")}
            description={tr("Добавьте существующий долг или зарегистрируйте получение нового кредита.")}
            action={tr("Добавить долг")}
            onAction={() => setEdit({})}
          />
        </Card>
      ) : (
        <div className="goals-grid finance-collection compact-debts debt-queue-grid" aria-label={tr("Долги по дате оплаты")}>
          {rows.slice(safePage*12,(safePage+1)*12)
            .map((d) => (
              <Card className="goal-card compact-debt" key={d.id} data-debt-id={d.id}>
                <div className="debt-queue-heading">
                  <Link to={"/debts/" + d.id}><h2>{categoryName(d.terms)}</h2></Link>
                  <div className={"debt-date-chip"+(d.status==="ACTIVE"&&d.terms.nextPayment&&d.terms.nextPayment<todayInBerlin?" is-overdue":"")}>
                    {d.terms.nextPayment?<time dateTime={d.terms.nextPayment}>{calendarLabel(d.terms.nextPayment)}</time>:<span>{tr("Без даты")}</span>}
                    {d.status!=="ACTIVE"?<small>{status(d.status)}</small>:d.terms.nextPayment&&d.terms.nextPayment<todayInBerlin?<small>{tr("Просрочен")}</small>:d.terms.nextPayment===todayInBerlin?<small>{tr("Сегодня")}</small>:null}
                  </div>
                </div>
                <div className="debt-queue-values">
                  <div><span>{tr("Осталось")}</span><strong>{formatMoney(d.remaining)}</strong></div>
                  {d.terms.monthlyPayment&&<div><span>{tr("Взнос в месяц")}</span><b>{formatMoney(d.terms.monthlyPayment)}</b></div>}
                </div>
                <ProgressBar value={d.progress} label={tr("Погашено: ")+d.terms.name} className="debt-queue-progress" tone={Number(d.progress)>=100?"success":"accent"}/>
                <DebtCompactSchedule debt={d} onPay={()=>setEdit({debt:d,pay:true})}/>
                <div className="debt-queue-footer">
                  {d.status==="ACTIVE"?<Button size="small" variant="secondary" aria-label={tr("Оплатить: ")+d.terms.name} onClick={()=>setEdit({debt:d,pay:true})}>{tr("Оплатить")}</Button>:<small>{status(d.status)}</small>}
                <Button
                  variant="ghost"
                  className="debt-card-open"
                  aria-haspopup="dialog"
                  aria-label={tr("График и действия: ") + d.terms.name}
                  onClick={(event) => {
                    debtActionRef.current = event.currentTarget;
                    setInspectedId(d.id);
                  }}
                >{" "}{tr("Подробнее")}{" "}<ChevronRight size={15} />
                </Button>
                </div>
              </Card>
            ))}
        </div>
      )}
      <CollectionPages page={safePage} total={pages} onChange={setPage}/>
      {inspected && (
        <Dialog
          open
          onClose={() => setInspectedId(null)}
          title={inspected.terms.name}
          description={tr("Ближайшие взносы и действия.")}
          returnFocusRef={debtActionRef}
        >
          <div className="debt-quick-view">
            <div className="debt-quick-balance">
              <span>{tr("Осталось выплатить")}</span>
              <strong>{formatMoney(inspected.remaining)}</strong>
              <Progress debt={inspected} />
            </div>
            {inspected.terms.description && (
              <p className="goal-description">{inspected.terms.description}</p>
            )}
            <DebtMonthProgress id={inspected.id} active={inspected.status === "ACTIVE"} compact />
            <div className="debt-quick-actions">
              <DebtPaymentAction debt={inspected} onPay={() => {
                setInspectedId(null);
                setEdit({debt: inspected, pay: true});
              }} />
              <Button variant="ghost" size="icon" title={tr("Изменить долг")} aria-label={tr("Изменить: ") + inspected.terms.name} onClick={() => {
                setInspectedId(null);
                setEdit({debt: inspected});
              }}>
                <Pencil size={17} />
              </Button>
              <DeleteDebt debt={inspected} compact />
            </div>
            <Link className="text-link" to={"/debts/" + inspected.id}>{" "}{tr("Посмотреть историю →")}{" "}</Link>
          </div>
        </Dialog>
      )}
      {edit && <DebtEditor {...edit} onClose={() => setEdit(null)} />}
    </>
  );
}
export function DebtDetailsPage() {
  const navigate=useNavigate();
  const [reversing, setReversing] = useState<Payment | null>(null);
  const { id = "" } = useParams();
  const debt = useDebt(id),
    accounts = useAccounts();
  const [page, setPage] = useState(0),
    history = useDebtHistory(id, page),
    [edit, setEdit] = useState<Edit | null>(null);
  if(debt.error instanceof ApiError&&debt.error.status===404)return <Card className="daily-panel"><EmptyState title={tr("Этот долг удалён")} description={tr("Он больше не входит в обязательства. Проведённые платежи сохранены.")} action={tr("К списку долгов")} onAction={()=>navigate("/debts")}/><details className="daily-details"><summary>{tr("История погашений")}</summary>{history.data?.content.map(p=><div className="allocation-row" key={p.id}><span>{p.operationDate}{p.reversed?tr(" · отменено"):""}</span><strong>{formatMoney(p.total)}</strong></div>)}</details></Card>;
  if (debt.error)
    return <ErrorNotice error={debt.error} retry={() => void debt.refetch()} />;
  if (!debt.data) return <Loading />;
  const d = debt.data;
  return (
    <>
      <div className="debt-detail-toolbar"><Link className="text-link" to="/debts">{" "}{tr("← Все обязательства")}{" "}</Link>
      <DeleteDebt debt={d} /></div>
      <PageHeading
        title={d.terms.name}
        description={
          d.terms.creditor === d.terms.name
            ? status(d.status)
            : d.terms.creditor + " · " + status(d.status)
        }
        action={d.status === "ACTIVE" ? tr("Внести платёж") : undefined}
        onAction={() => setEdit({ debt: d, pay: true })}
      />
      <Card className="goal-detail">
        <p>{d.terms.description}</p>
        <div className="goal-amount">
          <strong data-testid="debt-remaining">
            {formatMoney(d.remaining)}
          </strong>
          <span>{tr("остаток долга")}</span>
        </div>
        <Progress debt={d} />
        <DebtMonthProgress id={d.id} active={d.status==="ACTIVE"}/>
        <dl className="forecast-list">
          {[
            [tr("Первоначальная сумма"), formatMoney(d.originalAmount)],
            [tr("Остаток при вводе"), formatMoney(d.openingRemaining)],
            [tr("Всего погашено"), formatMoney(d.repaid)],
            [
              tr("Основной долг в истории Balance"),
              formatMoney(d.recordedPrincipal),
            ],
            [
              tr("Ежемесячный платёж"),
              d.terms.monthlyPayment
                ? formatMoney(d.terms.monthlyPayment)
                : tr("Не задан"),
            ],
            [tr("Следующий платёж"), d.terms.nextPayment ?? tr("Не задан")],
            [
              tr("Источник"),
              d.origin === "EXISTING"
                ? tr("Существующее обязательство: без движения денег")
                : tr("Получение нового кредита"),
            ],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <Button variant="secondary" onClick={() => setEdit({ debt: d })}>
          <Pencil size={16} />{" "}{tr("Редактировать / архивировать")}{" "}</Button>
        <p className="form-note">{" "}{tr("Ранее погашенная часть существующего долга не создаёт фиктивных денежных операций. Исходные суммы после создания сохраняются неизменными.")}{" "}</p>
      </Card>

      <Card className="goal-detail">
        <h2>{tr("История фактических погашений")}</h2>
        {history.error ? (
          <ErrorNotice error={history.error} />
        ) : !history.data ? (
          <Loading />
        ) : !history.data.content.length ? (
          <p className="page-note">{tr("Платежей в Balance пока нет.")}</p>
        ) : (
          <>
            <div className="savings-history">
              {history.data.content.map((p) => (
                <div key={p.id}>
                  <div>
                    <strong>
                      {p.operationDate} ·{" "}
                      {accounts.data?.find((a) => a.id === p.accountId)?.name ??
                        tr("Счёт")}
                    </strong>
                    <p>{p.description}</p>
                    {p.reversed ? (
                      <p className="validation-error">{" "}{tr("Сторнирован")}{" "}{p.reversalDate}: {p.reversalReason}
                      </p>
                    ) : (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => setReversing(p)}
                      >{" "}{tr("Исправить через сторно")}{" "}</Button>
                    )}
                    <small>{" "}{tr("Основной долг:")}{" "}{formatMoney(p.principal)}{" "}{tr("· проценты:")}{" "}
                      {formatMoney(p.interest)}
                    </small>
                  </div>
                  <span>{formatMoney(p.total)}</span>
                </div>
              ))}
            </div>
            <div className="pagination">
              <Button
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >{" "}{tr("Назад")}{" "}</Button>
              <span>{page + 1}</span>
              <Button
                variant="secondary"
                disabled={(page + 1) * 50 >= history.data.totalElements}
                onClick={() => setPage(page + 1)}
              >{" "}{tr("Далее")}{" "}</Button>
            </div>
          </>
        )}
      </Card>
      {reversing && (
        <ReversePayment
          debtId={id}
          payment={reversing}
          onClose={() => setReversing(null)}
        />
      )}
      {edit && <DebtEditor {...edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function DebtPaymentAction({debt,onPay}:{debt:Debt;onPay:()=>void}){return <Button variant="secondary" disabled={debt.status!=="ACTIVE"} onClick={onPay}>{tr("Внести платёж")}</Button>;}
function ReversePayment({
  debtId,
  payment,
  onClose,
}: {
  debtId: string;
  payment: Payment;
  onClose: () => void;
}) {
  const key = useRef(crypto.randomUUID()),
    guard = useRef(false),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const [error, setError] = useState<Error | null>(null);
  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      debtApi.reverse(
        debtId,
        payment.id,
        String(data.get("date")),
        String(data.get("reason")),
        key.current,
      ),
    retry: false,
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setError(null);
    try {
      await mutation.mutateAsync(new FormData(e.currentTarget));
      await refresh();
      notify(tr("Платёж сторнирован"));
      onClose();
    } catch (e) {
      setError(e as Error);
    } finally {
      guard.current = false;
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={tr("Сторнировать платёж?")}
      description={tr("Исходная запись останется в истории. Банк получит компенсационные зачисления, задолженность будет восстановлена. Затем можно внести правильный платёж.")}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={submit}>
        <p>{tr("Платёж:")}{" "}{formatMoney(payment.total)}</p>
        <Field label={tr("Дата сторно")}>
          <Input
            name="date"
            type="date"
            min={payment.operationDate}
            defaultValue={
              today() < payment.operationDate ? payment.operationDate : today()
            }
            required
          />
        </Field>
        <Field label={tr("Причина исправления")}>
          <Textarea name="reason" required maxLength={500} />
        </Field>
        <ErrorNotice error={error} />
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={mutation.isPending}>{" "}{tr("Подтвердить сторно")}{" "}</Button>
        </div>
      </form>
    </Dialog>
  );
}
function DebtEditor({debt,pay=false,onClose}:Edit & {onClose:()=>void}) {
  return debt?<ExistingDebtEditor debt={debt} pay={pay} onClose={onClose}/>:<SimpleDebtForm close={onClose}/>;
}
function ExistingDebtEditor({
  debt,
  pay = false,
  onClose,
}: {debt:Debt;pay?:boolean;onClose:()=>void}) {
  const plan=useDebtPlan(debt?.id??"");
  const accounts = useAccounts(),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const key = useRef(crypto.randomUUID()),
    guard = useRef(false),
    sent = useRef<FormData | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (pay) {
        const principal = normalizeMoney(String(data.get("principal")), false),
          interest = normalizeMoney(String(data.get("interest")), false);
        if (
          cents(principal) < 0n ||
          cents(interest) < 0n ||
          cents(principal) + cents(interest) <= 0n
        )
          throw new Error(
            tr("Суммы не могут быть отрицательными, общий платёж должен быть больше нуля."),
          );
        return (plan.data?.firstDate?debtApi.payScheduled:debtApi.pay)(
          debt!,
          {
            accountId: String(data.get("accountId")),
            principal,
            interest,
            operationDate: String(data.get("operationDate")),
            description: String(data.get("description")),
            scope: String(data.get("scope")),
            nextPayment: plan.data?.firstDate?null:String(data.get("nextPayment")) || null,
          },
          key.current,
        );
      }
      const terms: Terms = {
        name: String(data.get("name")).trim(),
        creditor: String(data.get("creditor")).trim(),
        description: String(data.get("description")),
        kind: String(data.get("kind")),
        annualRate: debt?.terms.annualRate ?? null,
        monthlyPayment: String(data.get("monthlyPayment")).trim()
          ? normalizeMoney(String(data.get("monthlyPayment")))
          : null,
        nextPayment: String(data.get("nextPayment")) || null,
      };
      return debtApi.update(debt, terms, String(data.get("status")));
    },
    retry: false,
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guard.current) return;
    const data =
      uncertain && sent.current ? sent.current : new FormData(e.currentTarget);
    sent.current = data;
    guard.current = true;
    setBusy(true);
    setError(null);
    try {
      await mutation.mutateAsync(data);
      await refresh();
      notify(pay ? tr("Платёж сохранён") : tr("Обязательство сохранено"));
      onClose();
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        void refresh();
      }
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  if(pay&&!plan.data)return <Dialog open title={tr("Погашение долга")} description={tr("Подготавливаем ближайший взнос.")} onClose={onClose}><ErrorNotice error={plan.error} retry={()=>void plan.refetch()}/>{!plan.error&&<Loading label={tr("Загружаем сумму платежа")}/>}</Dialog>;
  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={
        pay
          ? tr("Погашение долга")
          : debt
            ? tr("Редактировать обязательство")
            : tr("Новый долг или кредит")
      }
      description={
        pay
          ? tr("После подтверждения сумма уменьшит баланс и остаток долга.")+(debt?.terms.nextPayment&&debt.terms.nextPayment>berlinToday()?tr(" Вы оплачиваете будущий взнос заранее, сегодняшней датой."):"")
          : tr("Название, сумма платежа и дата. Описание можно оставить пустым.")
      }
    >
      <form className="form-stack" onSubmit={submit}>
        <fieldset disabled={busy || uncertain} className="form-stack">
          {pay ? (
            <>
              <Field label={tr("Основной долг, EUR")}>
                <Input
                  name="principal"
                  defaultValue={debt&&(debt.terms.annualRate===null?debt.terms.kind!=="BANK_LOAN":Number(debt.terms.annualRate)===0)?plan.data?.nextAmount??"":""}
                  inputMode="decimal"
                  required
                />
              </Field>
              {debt?.terms.kind==="BANK_LOAN"||!!debt?.terms.annualRate&&Number(debt.terms.annualRate)>0?<>
                <Field label={tr("Проценты, EUR")}>
                  <Input
                    name="interest"
                    defaultValue="0.00"
                    inputMode="decimal"
                    required
                  />
                </Field>
                <Field label={tr("Назначение процентов")}>
                  <Select name="scope">
                    <option value="PERSONAL">{tr("Личное")}</option>
                    <option value="HOUSEHOLD">{tr("Домашнее")}</option>
                  </Select>
                </Field>
              </>:<><input type="hidden" name="interest" value="0"/><input type="hidden" name="scope" value="PERSONAL"/></>}
            </>
          ) : (
            <>
              <Field label={tr("Название долга")}>
                <Input
                  name="name"
                  defaultValue={debt?.terms.name}
                  required
                  maxLength={100}
                />
              </Field>
              <input type="hidden" name="creditor" value={debt.terms.creditor}/>
              <input type="hidden" name="kind" value={debt.terms.kind}/>
              <div className="form-grid">
                <Field label={tr("Ежемесячный платёж, EUR")}>
                  <Input
                    name="monthlyPayment"
                    readOnly={!!plan.data?.firstDate}
                    inputMode="decimal"
                    defaultValue={debt?.terms.monthlyPayment ?? ""}
                    placeholder={tr("Не задан")}
                  />
                </Field>
              </div>
              {debt && (
                <Field label={tr("Статус обязательства")}>
                  <Select name="status" defaultValue={debt.status}>
                    <option value="ACTIVE">{tr("Активен")}</option>
                    <option value="CLOSED">{tr("Погашен")}</option>
                    <option value="ARCHIVED">{tr("В архиве")}</option>
                  </Select>
                </Field>
              )}
            </>
          )}
          {pay && (
            <>
              <Field label={tr("Банковский счёт")}>
                <Select
                  name="accountId"
                  required
                  defaultValue={
                    accounts.data?.filter(
                      (a) => a.active && a.currency === "EUR",
                    ).length === 1
                      ? accounts.data.find(
                          (a) => a.active && a.currency === "EUR",
                        )?.id
                      : ""
                  }
                >
                  <option value="">{tr("Выберите счёт EUR")}</option>
                  {accounts.data
                    ?.filter((a) => a.active && a.currency === "EUR")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {categoryName(a)}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={tr("Дата движения денег")}>
                <Input
                  name="operationDate"
                  type="date"
                  defaultValue={today()}
                  min="0001-01-01"
                  max={pay?berlinToday():"9999-12-31"}
                  required
                />
              </Field>
            </>
          )}
          {!(pay&&plan.data?.firstDate)&&<Field
            label={
              pay
                ? tr("Новая дата следующего платежа (необязательно)")
                : tr("Следующий платёж")
            }
          >
            <Input
              name="nextPayment"
              readOnly={!!plan.data?.firstDate}
              type="date"
              defaultValue={pay ? "" : (debt?.terms.nextPayment ?? "")}
              min="0001-01-01"
              max="9999-12-31"
            />
          </Field>}
          {plan.data?.firstDate&&<p className="form-note">{pay?tr("Следующий взнос и прогресс обновятся автоматически. Повторного списания по закрытому взносу не будет."):tr("Даты связаны с графиком. Для изменения первой даты используйте «Перенести график».")}</p>}
            <Field label={tr("Описание (необязательно)")}>
              <Textarea
                name="description"
                defaultValue={pay ? "" : (debt?.terms.description ?? "")}
                maxLength={2000}
              />
            </Field>
        </fieldset>
        <ErrorNotice error={error ?? accounts.error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Сохранение могло выполниться. Повтор создания/платежа использует прежний ключ без повторного движения денег. При редактировании обновите запись, если возник конфликт версии.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={busy}>
            {busy
              ? tr("Сохраняем…")
              : uncertain
                ? tr("Повторить запрос")
                : pay
                  ? tr("Провести платёж")
                  : tr("Сохранить")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDebt({debt,compact=false}:{debt:Debt;compact?:boolean}) {
 const [open,setOpen]=useState(false),refresh=useRefreshFinance(),navigate=useNavigate();
 const mutation=useMutation({mutationFn:async()=>{await debtApi.remove(debt.id);await refresh();setOpen(false);navigate("/debts");},retry:false});
 return <><Button variant="destructive" size={compact?"icon":"default"} className={"delete-action"+(compact?" goal-delete-quiet":"")} title={tr("Удалить долг")} aria-label={tr("Удалить долг: ")+debt.terms.name} onClick={()=>setOpen(true)}><Trash2 size={17}/>{!compact&&tr("Удалить")}</Button>
 {open&&<Dialog open title={tr("Удалить долг?")} description={tr("Долг исчезнет из списка. Проведённые платежи и движения денег сохранятся.")} busy={mutation.isPending} onClose={()=>setOpen(false)}>
 <ErrorNotice error={mutation.error}/><Button variant="destructive" disabled={mutation.isPending} onClick={()=>mutation.mutate()}>{tr("Удалить долг")}</Button></Dialog>}</>;
}
