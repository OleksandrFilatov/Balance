import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { Account, AccountCreate, AccountType } from "@/api/types";
import { useRefreshFinance } from "@/api/queries";
import { normalizeMoney } from "@/lib/money";
import { useFinanceUi } from "@/providers/finance-ui";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Field, Input, Select } from "./ui/input";
import { ErrorNotice } from "./feedback";
export function AccountForm({
  account,
  onClose,
}: {
  account?: Account;
  onClose: () => void;
}) {
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const guard = useRef(false),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const mutation = useMutation({
    mutationFn: (body: AccountCreate & { active: boolean }) =>
      account
        ? api.updateAccount(account.id, {
            name: body.name,
            type: body.type,
            active: body.active,
            version: account.version,
          })
        : api.createAccount(body),
    retry: false,
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guard.current || uncertain) return;
    const data = new FormData(event.currentTarget);
    try {
      const body = {
        name: String(data.get("name")).trim(),
        type: String(data.get("type")) as AccountType,
        currency:
          account?.currency ??
          String(data.get("currency")).trim().toUpperCase(),
        initialBalance:
          account?.initialBalance ??
          normalizeMoney(String(data.get("initialBalance")), false),
        active: data.get("active") === "on",
      };
      guard.current = true;
      setBusy(true);
      setError(null);
      await mutation.mutateAsync(body);
      await refresh();
      notify(account ? tr("Счёт обновлён") : tr("Счёт создан"));
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
  return (
    <Dialog
      open
      onClose={onClose}
      title={account ? tr("Редактировать счёт") : tr("Новый счёт")}
      description={
        account
          ? tr("Измените название, тип или активность счёта.")
          : tr("Добавьте место, где хранятся ваши деньги.")
      }
      busy={busy}
    >
      <form onSubmit={submit} className="form-stack">
        <fieldset disabled={busy || uncertain} className="form-stack">
          <Field label={tr("Название счёта")}>
            <Input
              name="name"
              defaultValue={account?.name}
              placeholder={tr("Например, Sparkasse")}
              required
              maxLength={100}
            />
          </Field>
          <Field label={tr("Тип счёта")}>
            <Select name="type" defaultValue={account?.type ?? "BANK"}>
              <option value="BANK">{tr("Банковский счёт")}</option>
              <option value="CASH">{tr("Наличные")}</option>
              <option value="SAVINGS">{tr("Сберегательный счёт")}</option>
            </Select>
          </Field>
          {!account ? (
            <div className="form-grid">
              <Field label={tr("Начальный остаток")}>
                <Input
                  name="initialBalance"
                  inputMode="decimal"
                  defaultValue="0.00"
                  required
                />
              </Field>
              <Field label={tr("Валюта")}>
                <Input
                  name="currency"
                  defaultValue="EUR"
                  required
                  pattern="[A-Za-z]{3}"
                  maxLength={3}
                />
              </Field>
            </div>
          ) : (
            <>
              <p className="form-note">{" "}{tr("Валюта и начальный остаток сохраняются, чтобы история операций оставалась согласованной.")}{" "}</p>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={account.active}
                />{" "}{tr("Счёт активен")}{" "}</label>
            </>
          )}
        </fieldset>
        <ErrorNotice error={error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Сервер мог сохранить счёт. Закройте окно и обновите список, прежде чем создавать его повторно.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button variant="secondary" disabled={busy} onClick={onClose}>{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={busy || uncertain}>
            {busy ? tr("Сохраняем…") : account ? tr("Сохранить") : tr("Создать счёт")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
