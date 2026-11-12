import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import {
  calendarApi,
  useCalendarObligations,
  type CalendarEvent,
  type CalendarDebtPayment,
} from "@/api/calendar";
import { ApiError } from "@/api/client";
import { useDisplayCurrency } from "@/api/money";
import { useAccounts, useRefreshFinance } from "@/api/queries";
import { formatMoney, normalizeMoney,cents } from "@/lib/money";
import {
  berlinToday,
  calendarDate,
  calendarKey,
  calendarRange,
  calendarDays,
  calendarLabel,
  moveCalendar,
} from "@/lib/calendar-dates";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Loading } from "@/components/feedback";
import { useFinanceUi } from "@/providers/finance-ui";
import {MonthPicker} from "@/components/month-picker";
import "@/styles/calendar.css";

const types = () => ({
  ADJUSTMENT: tr("Корректировки остатка"),
  INCOME: tr("Доходы"),
  EXPENSE: tr("Расходы"),
  DEBT: tr("Платежи по долгам"),
  TRANSFER: tr("Переводы"),
  LOAN: tr("Получение кредита"),
  REVERSAL: tr("Сторно"),
});
const statuses = () => ({
  PLANNED: tr("Запланировано"),
  COMPLETED: tr("Выполнено"),
  OVERDUE: tr("Просрочено"),
  CANCELLED: tr("Отменено"),
});
const amount = (e: CalendarEvent) =>
  e.amount === null
    ? tr("Сумма не задана")
    : (e.flow === "IN" ? "+" : e.flow === "OUT" ? "−" : "↔ ") +
      formatMoney(e.amount, e.currency);
const statusClass = (e: CalendarEvent) => "calendar-status status-" + e.status;
function validDate(value: string | null) {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "0001-01-01" &&
    value <= "9999-12-31" &&
    calendarKey(calendarDate(value)) === value
  );
}

export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("date"), anchor = validDate(initial) ? initial! : berlinToday();
  const mode = "month" as const;
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [action, setAction] = useState<"confirm" | "cancel" | null>(null);
  const { currency, currencies, setCurrency } = useDisplayCurrency();
  const { from, to } = calendarRange(anchor, mode);
  const query = useCalendarObligations(from, to, currency), report = query.data;
  const days = calendarDays(from, to), byDay = new Map(report?.days.map(day => [day.date, day]));
  const selectedDay = byDay.get(anchor);
  const offset = (calendarDate(from).getUTCDay() + 6) % 7;
  const nonzero = (value: string) => !/^0(?:\.0+)?$/.test(value);
  const selectRange = (date: string, nextMode = mode) => {
    if (!validDate(date)) return;
    setParams({ date, mode: nextMode }); setDetail(null); setAction(null);
  };
  const open = (event: CalendarEvent) => { setDetail(event); setAction(null); };
  const label = mode === "month"
    ? new Intl.DateTimeFormat(getLocale(), {month:"long", year:"numeric", timeZone:"UTC"}).format(calendarDate(anchor))
    : calendarLabel(from) + " — " + calendarLabel(to);
  return (<>
    <PageHeading title={tr("Календарь платежей")} description={tr("Выберите день, чтобы увидеть долги и коммуналку к оплате.")} />
    <div className="calendar-toolbar calendar-toolbar-simple">
      <MonthPicker label={tr("Месяц финансового календаря")} value={anchor.slice(0,7)} onChange={month=>selectRange(month+"-01")}/>
      <div className="calendar-view-actions">
        <Button variant="ghost" onClick={() => selectRange(berlinToday())}>{tr("Сегодня")}</Button>
        {currencies.length > 1 && <Select aria-label={tr("Валюта календаря")} value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c}>{c}</option>)}</Select>}
      </div>
    </div>
    {query.error ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : !report ? <Loading label={tr("Загружаем платежи")}/> :
      <div className="calendar-body">
        <Card className="calendar-month-card">
          <div className="calendar-grid-navigation"><Button variant="ghost" size="icon" aria-label={tr("Предыдущий месяц")} disabled={from==="0001-01-01"} onClick={()=>selectRange(moveCalendar(anchor,mode,-1))}><ChevronLeft size={19}/></Button><h2 className="calendar-period-label">{label}</h2><Button variant="ghost" size="icon" aria-label={tr("Следующий месяц")} disabled={to==="9999-12-31"} onClick={()=>selectRange(moveCalendar(anchor,mode,1))}><ChevronRight size={19}/></Button></div>
          <div className="calendar-weekdays" aria-hidden>{[tr("Пн"),tr("Вт"),tr("Ср"),tr("Чт"),tr("Пт"),tr("Сб"),tr("Вс")].map(d=><span key={d}>{d}</span>)}</div>
          <div className="calendar-grid" aria-label={mode==="month"?tr("Месячный финансовый календарь"):tr("Недельный финансовый календарь")}>
            {Array.from({length:offset},(_,i)=><div className="calendar-blank" key={"blank"+i}/>)}
            {days.map(date=>{
              const day = byDay.get(date);
              const pending=day?.events.filter(e=>!e.posted&&(e.status==="PLANNED"||e.status==="OVERDUE"))??[];
              const unknownDebt=pending.some(e=>e.type==="DEBT"&&e.amount===null);
              return <button type="button" key={date} data-testid={"calendar-day-"+date} className={"calendar-day "+(date===report.asOf?"is-today":"")} aria-label={date+tr(" · к оплате: ")+pending.length} aria-pressed={date===anchor} onClick={()=>{
                selectRange(date);
                if(matchMedia("(max-width:800px)").matches) requestAnimationFrame(()=>document.getElementById("calendar-selected-day")?.scrollIntoView({block:"nearest",behavior:"smooth"}));
              }}>
                <span className="calendar-day-number">{Number(date.slice(-2))}</span>
                {day&&pending.some(e=>e.type==="EXPENSE")&&<span className="calendar-cell-payment cell-household" data-testid={"calendar-cell-household-"+date}><span>{tr("Коммуналка")}</span><b>{day.householdDue===null?"—":formatMoney(day.householdDue,currency)}</b></span>}
                {day&&pending.some(e=>e.type==="DEBT")&&<span className="calendar-cell-payment cell-debt" data-testid={"calendar-cell-debt-"+date}><span>{tr("Долги")}</span><b>{unknownDebt?(cents(day.debtDue)>0n?tr("от ")+formatMoney(day.debtDue,currency):tr("Уточнить")):formatMoney(day.debtDue,currency)}</b></span>}
                {day && day.totalDue === null && <span className="calendar-day-unknown">{tr("Уточнить")}</span>}
                {day && day.unknownAmounts!=="0" && <span className="calendar-day-unknown">{tr("Уточнить")}</span>}
              </button>;
            })}
          </div>
          <div className="calendar-legend"><span><i className="day-dot debt-dot"/>{tr("Долги")}</span><span><i className="day-dot home-dot"/>{tr("Коммуналка и дом")}</span></div>
        </Card>
        <Card id="calendar-selected-day" className="calendar-selected-day" aria-label={tr("Платежи выбранного дня")}>
          <h2>{calendarLabel(anchor)}</h2>
          {selectedDay && <>
            <div className="calendar-day-balance"><span>{tr("Мне нужно заплатить")}</span><strong className={selectedDay.totalDue === null ? "amount-unknown" : undefined} data-testid="calendar-day-total">{selectedDay.totalDue === null ? tr("Укажите зарплаты") : formatMoney(selectedDay.totalDue,currency)}</strong><p className="form-note">{tr("Долги и моя доля коммуналки")}</p></div>
            {selectedDay.totalDue === null && <Link className="text-link" to={"/household?month="+anchor.slice(0,7)}>{tr("Указать зарплаты за этот месяц →")}</Link>}
            {selectedDay.unknownAmounts!=="0"&&<p role="status" className="warning-text">{tr("Не у всех платежей указана сумма. Уточните её, чтобы получить полный итог.")}</p>}
            <details key={anchor+currency} className="calendar-day-more">
            <summary>{tr("Подробнее")}</summary>
            <div className="calendar-day-breakdown">
              <div><span>{tr("Долги")}</span><strong data-testid="calendar-day-debts">{formatMoney(selectedDay.debtDue,currency)}</strong></div>
              <div><span>{tr("Моя коммуналка")}</span><strong data-testid="calendar-day-household">{selectedDay.householdDue === null ? tr("Доля не задана") : formatMoney(selectedDay.householdDue,currency)}</strong></div>
            </div>
            <p className="form-note">{tr("В списке — полные суммы платежей. В итог выше включена только ваша доля коммуналки.")}</p>
            {nonzero(selectedDay.paid)&&<p className="form-note" data-testid="calendar-day-paid">{tr("Проведено по счетам:")}{" "}{formatMoney(selectedDay.paid,currency)}</p>}
            {selectedDay.events.map(e=><EventRow key={e.id} event={e} onClick={()=>open(e)}/>)}
            {!selectedDay.events.length&&<p className="quiet-empty">{tr("На этот день платежей нет.")}</p>}
            </details>
          </>}
        </Card>
      </div>
    }
      {detail && !action && (
        <Dialog
          open
          onClose={() => setDetail(null)}
          title={detail.title}
          description={
            calendarLabel(detail.date) + " · " + statuses()[detail.status]
          }
        >
          <dl className="calendar-details">
            <div>
              <dt>{tr("Сумма")}</dt>
              <dd>{amount(detail)}</dd>
            </div>
            <div>
              <dt>{tr("Тип")}</dt>
              <dd>{types()[detail.type]}</dd>
            </div>
            <div>
              <dt>{tr("Плановая дата")}</dt>
              <dd>{detail.scheduledDate ?? tr("Не задана")}</dd>
            </div>
            <div>
              <dt>{tr("Движение денег")}</dt>
              <dd>
                {detail.posted ? tr("Фактически проведено") : tr("Баланс не изменён")}
              </dd>
            </div>
          </dl>
          <p className="form-note">{detail.note}</p>
          {detail.source.startsWith("DEBT") && (
            <Link className="text-link" to={"/debts/" + detail.sourceId}>{" "}{tr("Открыть обязательство и историю →")}{" "}</Link>
          )}
          {detail.source === "RECURRING" && (
            <Link className="text-link" to={detail.note.startsWith(tr("Коммуналка за "))?"/household?month="+(detail.scheduledDate??detail.date).slice(0,7):"/recurring"}>
              {detail.note.startsWith(tr("Коммуналка за "))?tr("Оплатить коммуналку за месяц →"):tr("Открыть регулярные платежи →")}
            </Link>
          )}
          {detail.transactionId && detail.status !== "CANCELLED" && (
            <Link
              className="text-link"
              to="/money"
            >{" "}{tr("Открыть связанные операции →")}{" "}</Link>
          )}
          <div className="calendar-event-actions">
            {detail.canConfirm && (
              <Button onClick={() => setAction("confirm")}>
                <Check size={16} />{" "}{tr("Подтвердить проведение")}{" "}</Button>
            )}
            {detail.canCancel && (
              <Button variant="secondary" onClick={() => setAction("cancel")}>
                <X size={16} />{" "}{tr("Отменить выполнение")}{" "}</Button>
            )}
          </div>
        </Dialog>
      )}
      {detail && action && (
        <EventAction
          event={detail}
          action={action}
          close={() => {
            setDetail(null);
            setAction(null);
          }}
        />
      )}
    </>
  );
}
function EventRow({
  event: e,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  return (
    <button
      className="calendar-event"
      type="button"
      data-testid="calendar-event"
      onClick={onClick}
    >
      <div>
        <strong>{e.title}</strong>
        <small>
          {e.date} · {types()[e.type]}
          {e.posted ? tr(" · Факт") : tr(" · План")}
        </small>
        <span className={statusClass(e)}>{statuses()[e.status]}</span>
      </div>
      <span className="calendar-amount">{amount(e)}</span>
    </button>
  );
}
function EventAction({
  event,
  action,
  close,
}: {
  event: CalendarEvent;
  action: "confirm" | "cancel";
  close: () => void;
}) {
  const accounts = useAccounts(),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi(),
    guard = useRef(false),
    key = useRef(crypto.randomUUID());
  const [date, setDate] = useState(berlinToday()),
    [reason, setReason] = useState(""),
    [account, setAccount] = useState(""),
    [principal, setPrincipal] = useState(""),
    [interest, setInterest] = useState("0"),
    [next, setNext] = useState(""),
    [scope, setScope] = useState("PERSONAL"),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false);
  const stored = useRef<{
    date: string;
    reason: string;
    payment: CalendarDebtPayment | null;
  } | null>(null);
  const debt = event.source === "DEBT",
    cancelling = action === "cancel";
  const mutation = useMutation({
    mutationFn: async (body: NonNullable<typeof stored.current>) => {
      if (cancelling)
        return event.source === "RECURRING"
          ? calendarApi.cancelRecurring(event, body.reason)
          : calendarApi.cancelPending(event);
      if (debt)
        return calendarApi.confirmDebt(event, body.payment!, key.current);
      return event.source === "RECURRING"
        ? calendarApi.confirmRecurring(event, body.date)
        : calendarApi.confirmPending(event, body.date);
    },
    onSuccess: async () => {
      await refresh();
      notify(cancelling ? tr("Выполнение отменено") : tr("Платёж проведён"));
      close();
    },
    retry: false,
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setError(null);
    try {
      if (!uncertain)
        stored.current = {
          date,
          reason,
          payment: debt
            ? {
                accountId: account,
                principal: normalizeMoney(principal, false),
                interest: normalizeMoney(interest, false),
                operationDate: date,
                scope,
                description: tr("Платёж из финансового календаря"),
                nextPayment: next || null,
              }
            : null,
        };
      await mutation.mutateAsync(stored.current!);
    } catch (err) {
      setError(err as Error);
      if (err instanceof ApiError) {
        if (err.status === 0 || err.status >= 500) setUncertain(true);
        if (err.status === 409) void refresh();
      }
    } finally {
      guard.current = false;
    }
  };
  return (
    <Dialog
      open
      title={cancelling ? tr("Отменить выполнение?") : tr("Подтвердить платёж")}
      description={
        event.title +
        tr(" · плановая дата ") +
        (event.scheduledDate ?? event.date) +
        ". " +
        (cancelling
          ? tr("Отменяется только это выполнение, не всё расписание.")
          : tr("Проверьте фактические данные перед проведением."))
      }
      onClose={close}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={(e) => void submit(e)}>
        <fieldset
          className="form-stack"
          disabled={mutation.isPending || uncertain}
        >
          {cancelling ? (
            event.source === "RECURRING" ? (
              <Field label={tr("Причина отмены")}>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={500}
                />
              </Field>
            ) : (
              <p>{" "}{tr("Ожидающая операция будет отменена без списания денег. Её история останется в календаре.")}{" "}</p>
            )
          ) : (
            <>
              <p>{amount(event)}</p>
              {event.type === "EXPENSE" && <p className="form-note">{tr("Будет записана полная сумма платежа. В основном календаре показана только ваша доля коммуналки.")}</p>}
              <Field label={tr("Фактическая дата")}>
                <Input
                  type="date"
                  min="0001-01-01"
                  max={berlinToday()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              {debt && (
                <>
                  <p className="form-note">{" "}{tr("Укажите реальное разделение основного долга и процентов. Оно не рассчитывается из неизвестных условий. При частичном погашении нужен следующий срок, позже текущего.")}{" "}</p>
                  {accounts.error ? (
                    <ErrorNotice
                      error={accounts.error}
                      retry={() => void accounts.refetch()}
                    />
                  ) : !accounts.data ? (
                    <Loading />
                  ) : (
                    <Field label={tr("Счёт списания")}>
                      <Select
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        required
                      >
                        <option value="">{tr("Выберите счёт")}</option>
                        {accounts.data
                          .filter(
                            (a) => a.active && a.currency === event.currency,
                          )
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {categoryName(a)} · {a.currency}
                            </option>
                          ))}
                      </Select>
                    </Field>
                  )}
                  <div className="form-grid">
                    <Field label={tr("Основной долг")}>
                      <Input
                        inputMode="decimal"
                        value={principal}
                        onChange={(e) => setPrincipal(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label={tr("Проценты")}>
                      <Input
                        inputMode="decimal"
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                  <Field label={tr("Назначение процентов")}>
                    <Select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                    >
                      <option value="PERSONAL">{tr("Личное")}</option>
                      <option value="HOUSEHOLD">{tr("Домашнее")}</option>
                    </Select>
                  </Field>
                  <Field label={tr("Дата следующего платежа")}>
                    <Input
                      type="date"
                      min={event.scheduledDate ?? event.date}
                      max="9999-12-31"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                    />
                  </Field>
                </>
              )}
            </>
          )}
        </fieldset>
        <ErrorNotice error={error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Ответ не получен. Данные зафиксированы; повтор отправит исходный запрос. При конфликте закройте окно и проверьте календарь.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button
            variant="secondary"
            type="button"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Закрыть")}{" "}</Button>
          <Button
            type="submit"
            disabled={
              mutation.isPending || (!cancelling && debt && !accounts.data)
            }
          >
            {mutation.isPending
              ? tr("Сохраняем…")
              : uncertain
                ? tr("Повторить запрос")
                : cancelling
                  ? tr("Подтвердить отмену")
                  : tr("Провести платёж")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
