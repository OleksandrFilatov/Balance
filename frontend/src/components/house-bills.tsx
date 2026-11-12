import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, History, Pencil } from "lucide-react";
import {
  recurringApi,
  useRecurringHistory,
  type Rule,
  type RecurringInput,
} from "@/api/recurring";
import { useAccounts, useCategories, useRefreshFinance } from "@/api/queries";
import { useMoney, moneyApi } from "@/api/money";
import { RecurringHistory } from "@/pages/recurring";
import { formatMoney, normalizeMoney } from "@/lib/money";
import { berlinToday } from "@/lib/calendar-dates";
import { ApiError } from "@/api/client";
import { useFinanceUi } from "@/providers/finance-ui";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Field, Select,Textarea } from "./ui/input";
import { ErrorNotice } from "./feedback";
import {DeleteRecurring} from "./recurring-actions";
import {monthName} from "@/lib/dates";
import {calendarLabel} from "@/lib/calendar-dates";
export const frequencyNames = (): Record<string, string> => ({
  ONCE:tr("Один раз"),
  DAILY: tr("Каждый день"),
  WEEKLY: tr("Каждую неделю"),
  MONTHLY: tr("Каждый месяц"),
  QUARTERLY: tr("Раз в квартал"),
  YEARLY: tr("Каждый год"),
});
export function HouseBill({
  rule: r,
  compact = false,
  hideName = false,
  monthly = false,
  selectedMonth,
}: {
  rule: Rule;
  compact?: boolean;
  hideName?: boolean;
  monthly?: boolean;
  selectedMonth?: string;
}) {
  const h = useRecurringHistory(r.id, 0),
    [dialog, setDialog] = useState<"pay" | "edit" | "history" | null>(null),
    today = berlinToday();
  const due = r.status === "ACTIVE" && !!r.nextDate && r.nextDate <= today;
  const recent = h.data?.content[0]?.transaction.operationDate;
  return (
    <>
      <div className="house-bill" data-testid="house-bill">
        <div className="bill-heading">
          <div>
            {!hideName && <strong>{categoryName(r.template)}</strong>}
            <p>
              {frequencyNames()[r.template.frequency]} ·{" "}
              {r.nextDate ? tr("Следующая оплата ") + r.nextDate : tr("Завершён")}
            </p>
          </div>
          <b>{formatMoney(r.template.amount, r.currency)}</b>
        </div>
        <div className="bill-status">
          {monthly ? <span>{tr("Входит в оплату месяца")}</span> : r.status !== "ACTIVE" ? (
            <span>{tr("Приостановлен")}</span>
          ) : r.nextDate && r.nextDate < today ? (
            <span className="warning-text">{tr("Просрочен")}</span>
          ) : due ? (
            <span className="warning-text">{tr("Пора оплатить")}</span>
          ) : (
            <span>{tr("Запланирован")}</span>
          )}
          {recent && (
            <span className="success-text">
              <Check size={13} />{" "}{tr("Последняя оплата")}{" "}{recent}
            </span>
          )}
          {r.template.automatic && <span>{tr("Автоматическая запись")}</span>}
        </div>
        <div className="bill-actions">
          {due && !monthly && (
            <Button
              size="small"
              variant={due ? "default" : "secondary"}
              disabled={!due}
              onClick={() => setDialog("pay")}
            >{" "}{tr("Отметить оплаченным")}{" "}</Button>
          )}
          {!compact && (
            <>
              <Button
                variant="secondary"
                size="small"
                aria-label={tr("Изменить платёж: ") + r.template.name}
                onClick={() => setDialog("edit")}
              >
                <Pencil size={17} />{" "}{tr("Изменить")}{" "}</Button>
              <Button
                variant="secondary"
                size="small"
                aria-label={tr("История платежа: ") + r.template.name}
                onClick={() => setDialog("history")}
              >
                <History size={17} />{" "}{tr("История")}{" "}</Button>
              <DeleteRecurring rule={r}/>
            </>
          )}
        </div>
        {r.lastError && (
          <p role="alert" className="warning-text">
            {r.lastError}
          </p>
        )}
      </div>
      {dialog === "pay" && (
        <PayHouseBill rule={r} close={() => setDialog(null)} />
      )}{" "}
      {dialog === "history" && (
        <RecurringHistory rule={r} onClose={() => setDialog(null)} />
      )}{" "}
      {dialog === "edit" && (
        <HouseBillForm
          rule={r}
          fixedName={r.template.name}
          selectedMonth={selectedMonth}
          close={() => setDialog(null)}
        />
      )}
    </>
  );
}
function PayHouseBill({ rule, close }: { rule: Rule; close: () => void }) {
  const [date, setDate] = useState(berlinToday()),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false),
    guard = useRef(false),
    snapshot = useRef("");
  const refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const mutation = useMutation({
    mutationFn: () => recurringApi.confirm(rule, snapshot.current),
    onSuccess: async () => {
      await refresh();
      notify(tr("Оплата записана"));
      close();
    },
    retry: false,
  });
  return (
    <Dialog
      open
      title={tr("Подтвердить оплату")}
      description={
        rule.template.name +
        tr(". Деньги будут учтены один раз; повтор запроса не создаст второе списание.")
      }
      onClose={close}
      busy={mutation.isPending}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (guard.current) return;
          guard.current = true;
          setError(null);
          if (!uncertain) snapshot.current = date;
          try {
            await mutation.mutateAsync();
          } catch (e) {
            setError(e as Error);
            if (e instanceof ApiError && (e.status === 0 || e.status >= 500))
              setUncertain(true);
            if (e instanceof ApiError && e.status === 409) void refresh();
          } finally {
            guard.current = false;
          }
        }}
      >
        <strong className="bill-pay-amount">
          {formatMoney(rule.template.amount, rule.currency)}
        </strong>
        <p className="form-note">{" "}{tr("Это запись оплаты в Balance. Банковский перевод приложение не отправляет.")}{" "}</p>
        <Field label={tr("Дата оплаты")}>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={berlinToday()}
            required
            disabled={mutation.isPending || uncertain}
          />
        </Field>
        <ErrorNotice error={error} />
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {uncertain ? tr("Повторить запрос") : tr("Записать оплату")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function HouseBillForm({
  rule,
  categoryId,
  fixedName,
  group,
  selectedMonth,
  onCreated,
  close,
}: {
  rule?: Rule;
  categoryId?: string;
  fixedName?: string;
  group?:"FIXED"|"EXTRA";
  selectedMonth?: string;
  onCreated?: (firstDate: string) => void;
  close: () => void;
}) {
  const accounts = useAccounts(),
    categories = useCategories(),
    money = useMoney(),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const [name, setName] = useState(rule?.template.name ?? ""),
    [description,setDescription]=useState(rule?.template.description??""),
    [amount, setAmount] = useState(rule?.template.amount ?? ""),
    [account, setAccount] = useState(rule?.template.accountId ?? ""),
    [frequency, setFrequency] = useState(rule?.template.frequency === "ONCE"?"MONTHLY":rule?.template.frequency ?? "MONTHLY"),
    [term,setTerm]=useState(rule?.template.frequency==="ONCE"?"once":rule?.template.endDate?"limited":"regular"),
    [endDate,setEndDate]=useState(rule?.template.endDate??""),
    [date, setDate] = useState(rule?.nextDate ?? (selectedMonth&&selectedMonth>berlinToday().slice(0,7)?selectedMonth+"-01":berlinToday())),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false);
  const guard = useRef(false);
  // Keep existing classification; custom payments use the existing Other category.
  const category =
    rule?.template.categoryId ??
    categoryId ??
    categories.data?.find(
      (c) => c.id === "00000000-0000-0000-0001-000000000009" && c.active,
    )?.id ??
    categories.data?.find(
      (c) =>
        c.type === "EXPENSE" &&
        c.active &&
        c.name.trim().toLowerCase() === tr("другое"),
    )?.id ??
    "";
  const chosen =
    account ||
    money.data?.defaultAccountId ||
    accounts.data?.find((a) => a.active)?.id ||
    "";
  const mutation = useMutation({
    mutationFn: async () => {
      let id = chosen;
      if (!id && accounts.data?.length === 0) id = (await moneyApi.ensure()).id;
      const body: RecurringInput = {
        name: fixedName ?? name,
        amount: normalizeMoney(amount),
        categoryId: category,
        accountId: id,
        type: "EXPENSE",
        scope: "HOUSEHOLD",
        frequency:term==="once"?"ONCE":frequency,
        firstDate:
          rule && date === rule.nextDate ? rule.template.firstDate : date,
        description,
        automatic: term!=="once"&&(frequency==="MONTHLY"||rule?.template.automatic===true),
        endDate:term==="limited"?endDate:null,
        householdSplit: rule?.template.householdSplit ?? (fixedName||group==="FIXED" ? "PROPORTIONAL" : "EQUAL"),
        householdGroup:rule?.template.householdSplit==="PROPORTIONAL"||!rule&&(fixedName||group==="FIXED")?"FIXED":"EXTRA",
      };
      return rule
        ? recurringApi.update(rule, body, rule.status)
        : recurringApi.create(body);
    },
    onSuccess: async (saved) => {
      await refresh();
      notify(tr("Домашний платёж сохранён"));
      close();
      if(!rule)onCreated?.(saved.template.firstDate);
    },
    retry: false,
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (guard.current || uncertain) return;
    guard.current = true;
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        void refresh();
      }
    } finally {
      guard.current = false;
    }
  };
  return (
    <Dialog
      open
      title={
        fixedName ??
        (rule ? tr("Изменить домашний платёж") : group==="FIXED"?tr("Добавить постоянный платёж"):tr("Добавить дополнительный расход"))
      }
      description={rule?.template.householdSplit==="PROPORTIONAL"||!rule&&(fixedName||group==="FIXED")?tr("Платёж делится по зарплатам выбранного месяца. Списание — только при оплате месяца."):tr("Каждому — половина суммы. Зарплаты не влияют на дополнительные расходы.")}
      onClose={close}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={(e) => void submit(e)}>
        <fieldset
          disabled={mutation.isPending || uncertain}
          className="form-stack"
        >
          {!fixedName && (
            <Field label={tr("Название платежа")}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
            </Field>
          )}
          <Field label={tr("Сумма платежа")}>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <div className="period-segments" role="group" aria-label={tr("Срок домашнего платежа")}>{[["regular",tr("Без срока")],["limited",tr("До даты")],["once",tr("Разовый")]].map(([value,label])=><Button key={value} variant="ghost" aria-pressed={term===value} onClick={()=>setTerm(value)}>{label}</Button>)}</div>
          <div className="form-grid">
            {!fixedName && term!=="once" && (
              <Field label={tr("Как часто")}>
                <Select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {Object.entries(frequencyNames()).filter(([id])=>id!=="ONCE").map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={tr("Следующая дата оплаты")}>
              <Input
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          </div>
          {term==="limited"&&<Field label={tr("Последняя дата оплаты")}><Input type="date" min={rule&&date===rule.nextDate?rule.template.firstDate:date} max="9999-12-31" value={endDate} onChange={e=>setEndDate(e.target.value)} required/></Field>}
          {term==="limited"&&<p className="form-note">{tr("Дата включительно. После неё новые платежи не начисляются. Каждый взнос делится по прежнему правилу.")}</p>}
          {!rule&&selectedMonth&&date.slice(0,7)>selectedMonth&&<p className="form-note" role="status">{tr("Первая оплата —")}{" "}{calendarLabel(date)}{tr(". После сохранения откроется")}{" "}{monthName(date.slice(0,7))}{tr(", чтобы новый платёж сразу был виден в его месяце.")}</p>}
          {!rule&&selectedMonth&&selectedMonth<berlinToday().slice(0,7)&&<p className="form-note">{tr("Вы смотрите прошлый месяц. Новое расписание не изменяет уже сохранённую историю коммуналки.")}</p>}
          {(accounts.data?.length ?? 0) > 1 && (
            <Field label={tr("Откуда оплатить")}>
              <Select
                value={chosen}
                onChange={(e) => setAccount(e.target.value)}
                required
              >
                {accounts.data
                  ?.filter((a) => a.active || a.id === chosen)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {categoryName(a)} · {a.currency}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <Field label={tr("Описание (необязательно)")}><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} maxLength={1500}/></Field>
        </fieldset>
        <ErrorNotice error={error ?? accounts.error ?? categories.error} />
        {categories.data && !category && (
          <p role="alert">{" "}{tr("Добавьте категорию «Другое» в разделе «Категории» для добавления своего платежа.")}{" "}</p>
        )}
        {uncertain && (
          <p className="form-note">{" "}{tr("Проверьте сохранённый платёж после закрытия окна. Повторное создание заблокировано.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button
            type="submit"
            disabled={mutation.isPending || uncertain || !category}
          >{" "}{tr("Сохранить платёж")}{" "}</Button>
        </div>
      </form>
    </Dialog>
  );
}
