import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { write, ApiError } from "@/api/client";
import { debtApi, type Debt } from "@/api/debts";
import { useRefreshFinance,useAccounts } from "@/api/queries";
import {useMoney,moneyApi} from "@/api/money";
import { normalizeMoney } from "@/lib/money";
import { berlinToday } from "@/lib/calendar-dates";
import { useFinanceUi } from "@/providers/finance-ui";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Field, Input,Textarea,Select } from "./ui/input";
import { ErrorNotice } from "./feedback";

export function SimpleDebtForm({
  close,
}: {
  close: () => void;
}) {
  const [monthly, setMonthly] = useState(false),
    [selected,setSelected]=useState<string|null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const key = useRef(crypto.randomUUID()),
    guard = useRef(false),
    snapshot = useRef<FormData | null>(null);
  const refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const accounts=useAccounts(),money=useMoney(),available=accounts.data?.filter(a=>a.active&&a.currency==="EUR")??[];
  const chosen=selected??money.data?.defaultAccountId??(available.length===1?available[0].id:"");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    const data =
      uncertain && snapshot.current
        ? snapshot.current
        : new FormData(e.currentTarget);
    snapshot.current = data;
    try {
      const name = String(data.get("name")).trim(),
        amount = normalizeMoney(String(data.get("amount")));
      if (monthly){
        const body={
            name,
            payment: amount,
            firstDate: String(data.get("firstDate")),
            endDate: String(data.get("endDate")),
            description:String(data.get("description")??"").trim(),
          };
        let account=String(data.get("autoAccount")??chosen);
        if(data.get("automatic")&&accounts.data?.length===0)account=(await moneyApi.ensure()).id;
        await write<Debt>(data.get("automatic")?"/debts/monthly-auto":"/debts/monthly","POST",data.get("automatic")?{debt:body,accountId:account}:body,
          key.current,
        );
      }else
        await debtApi.create(
          {
            terms: {
              name,
              creditor: name,
              description: String(data.get("description")??"").trim(),
              kind: "PERSONAL",
              annualRate: null,
              monthlyPayment: null,
              nextPayment: String(data.get("nextDate")) || null,
            },
            originalAmount: amount,
            openingRemaining: amount,
            currency: "EUR",
            origin: "EXISTING",
            accountId: null,
            operationDate: null,
          },
          key.current,
        );
      await refresh();
      notify(tr("Долг добавлен"));
      close();
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500))
        setUncertain(true);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={tr("Новый долг")}
      description={tr("Запишите существующий долг. Деньги со счёта пока не списываются.")}
      onClose={close}
      busy={busy}
    >
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="form-stack" disabled={busy || uncertain}>
          <div className="segmented" aria-label={tr("Вариант долга")}>
            <button
              type="button"
              aria-pressed={!monthly}
              className={!monthly ? "selected" : ""}
              onClick={() => setMonthly(false)}
            >{" "}{tr("Кому и сколько")}{" "}</button>
            <button
              type="button"
              aria-pressed={monthly}
              className={monthly ? "selected" : ""}
              onClick={() => setMonthly(true)}
            >{" "}{tr("Раз в месяц")}{" "}</button>
          </div>
          <Field label={monthly ? tr("За что плачу") : tr("Кому должен")}>
            <Input name="name" required maxLength={100} />
          </Field>
          <Field label={monthly ? tr("Платёж в месяц, EUR") : tr("Всего должен, EUR")}>
            <Input name="amount" inputMode="decimal" required />
          </Field>
          {monthly ? (
            <>
              <Field label={tr("Первая дата платежа")}>
                <Input
                  name="firstDate"
                  type="date"
                  defaultValue={berlinToday()}
                  required
                  min="0001-01-01"
                  max="9999-12-31"
                />
              </Field>
              <Field label={tr("Платить до")}>
                <Input
                  name="endDate"
                  type="date"
                  required
                  min="0001-01-01"
                  max="9999-12-31"
                />
              </Field>
              <p className="form-note">{" "}{tr("Ежемесячно в день первой оплаты, до указанной даты включительно. Если такого числа нет — в последний день месяца. Общий долг рассчитает сервер, без процентов.")}{" "}</p>
              <input type="hidden" name="automatic" value="on"/>
              <p className="routine-auto-note">{tr("Взносы оплачиваются автоматически по расписанию. Можно также оплатить ближайший взнос заранее.")}</p>
              {available.length>1?<Field label={tr("Счёт автооплаты")}><Select name="autoAccount" value={chosen} onChange={e=>setSelected(e.target.value)} required><option value="">{tr("Выберите счёт")}</option>{available.map(a=><option value={a.id} key={a.id}>{categoryName(a)}</option>)}</Select></Field>:<input type="hidden" name="autoAccount" value={chosen}/>}
            </>
          ) : (
            <Field label={tr("Вернуть до (необязательно)")}>
              <Input
                name="nextDate"
                type="date"
                min="0001-01-01"
                max="9999-12-31"
              />
            </Field>
          )}
          <Field label={tr("Описание (необязательно)")}><Textarea name="description" rows={2} maxLength={2000} placeholder={tr("Например, за что этот долг")}/></Field>
        </fieldset>
        <ErrorNotice error={error} />
        <div className="dialog-footer">
          <Button variant="secondary" onClick={close} disabled={busy}>{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={busy}>
            {uncertain ? tr("Повторить запрос") : tr("Сохранить")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
