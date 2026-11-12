import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
﻿import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { moneyApi, useMoney } from "@/api/money";
import { CategoryManagerDialog } from "./category-manager";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { api, ApiError } from "@/api/client";
import type {
  Account,
  Category,
  Scope,
  Status,
  Transaction,
  UserTransactionType as TransactionType,
  TransactionWrite,
} from "@/api/types";
import { useAccounts, useCategories, useRefreshFinance } from "@/api/queries";
import { normalizeMoney } from "@/lib/money";
import { today } from "@/lib/dates";
import { useFinanceUi } from "@/providers/finance-ui";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Field, Input, Select, Textarea } from "./ui/input";
import { EmptyState, ErrorNotice, Loading } from "./feedback";
import {DeleteMoneyOperation} from "./recurring-actions";
export const typeLabels = () => ({
  INCOME: tr("Доход"),
  EXPENSE: tr("Расход"),
  TRANSFER: tr("Перевод"),
} as const);
type Defaults = { type?: TransactionType; scope?: Scope; categoryId?: string; operationDate?: string };
export function TransactionForm({
  transaction,
  accountId,
  defaults,
  onClose,
}: {
  transaction?: Transaction;
  accountId?: string;
  defaults?: Defaults;
  onClose: () => void;
}) {
  const accounts = useAccounts(),
    categories = useCategories();
  const ui = useFinanceUi();
  const overview = useMoney(),
    refresh = useRefreshFinance(),
    attempted = useRef(false);
  const ensure = useMutation({
    mutationFn: () => moneyApi.ensure(),
    onSuccess: () => refresh(),
    retry: false,
  });
  useEffect(() => {
    if (accounts.data?.length === 0 && !transaction && !attempted.current) {
      attempted.current = true;
      ensure.mutate();
    }
  }, [accounts.data, transaction]);
  if (accounts.data?.length === 0 && !transaction)
    return (
      <Dialog
        open
        title={tr("Мои деньги")}
        description={tr("Подготавливаем личный учёт. Банковская карта не нужна.")}
        onClose={onClose}
      >
        {ensure.error ? (
          <ErrorNotice error={ensure.error} retry={() => ensure.mutate()} />
        ) : (
          <Loading />
        )}
      </Dialog>
    );
  if (accounts.isPending || categories.isPending)
    return (
      <Dialog
        open
        onClose={onClose}
        title={tr("Операция")}
        description={tr("Подготавливаем форму")}
      >
        <Loading />
      </Dialog>
    );
  const error = accounts.error ?? categories.error;
  if (error)
    return (
      <Dialog
        open
        onClose={onClose}
        title={tr("Операция")}
        description={tr("Данные недоступны")}
      >
        <ErrorNotice
          error={error}
          retry={() => {
            void accounts.refetch();
            void categories.refetch();
          }}
        />
      </Dialog>
    );
  if (!accounts.data || !categories.data)
    return (
      <Dialog
        open
        onClose={onClose}
        title={tr("Операция")}
        description={tr("Подготавливаем форму")}
      >
        <Loading />
      </Dialog>
    );
  if (!transaction && accounts.data.length > 1 && overview.isPending)
    return (
      <Dialog
        open
        title={tr("Мои деньги")}
        description={tr("Подготавливаем форму")}
        onClose={onClose}
      >
        <Loading />
      </Dialog>
    );
  if (!accounts.data.some((a) => a.active) && !transaction)
    return (
      <Dialog
        open
        onClose={onClose}
        title={tr("Новая операция")}
        description={tr("Сначала добавьте активный счёт")}
      >
        <EmptyState
          title={tr("Нет активного места хранения денег")}
          description={tr("Ваши прежние данные сохранены. Восстановите нужный счёт в разделе «Мои счета».")}
          action={tr("Создать счёт")}
          onAction={() => {
            onClose();
            ui.openAccount();
          }}
        />
      </Dialog>
    );
  return (
    <Editor
      accounts={accounts.data}
      categories={categories.data}
      transaction={transaction}
      accountId={accountId ?? overview.data?.defaultAccountId ?? undefined}
      defaults={defaults}
      onClose={onClose}
    />
  );
}
function Editor({
  accounts,
  categories,
  transaction,
  accountId,
  defaults,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction;
  accountId?: string;
  defaults?: Defaults;
  onClose: () => void;
}) {
  const first =
    accountId ??
    (accounts.filter((a) => a.active).length === 1
      ? accounts.find((a) => a.active)?.id
      : undefined) ??
    "";
  const [type, setType] = useState<TransactionType>(
    (transaction?.type as TransactionType) ?? defaults?.type ?? "EXPENSE",
  );
  const [debit, setDebit] = useState(transaction?.debitAccountId ?? first),
    [credit, setCredit] = useState(transaction?.creditAccountId ?? first);
  const [category, setCategory] = useState(
    transaction?.categoryId ?? defaults?.categoryId ?? "",
  );
  const [scope, setScope] = useState<Scope>(
      transaction?.scope ?? defaults?.scope ?? "PERSONAL",
    ),
    [status, setStatus] = useState<Status>(transaction?.status ?? "CONFIRMED");
  const [amount, setAmount] = useState(transaction?.amount ?? ""),
    [date, setDate] = useState(transaction?.operationDate ?? defaults?.operationDate ?? today()),
    [description, setDescription] = useState(transaction?.description ?? "");
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null),
    [manageCategories, setManageCategories] = useState(false);
  const key = useRef(crypto.randomUUID()),
    guard = useRef(false),
    sent = useRef<TransactionWrite | null>(null);
  const refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const mutation = useMutation({
    mutationFn: (body: TransactionWrite) =>
      transaction
        ? api.updateTransaction(transaction, body)
        : api.createTransaction(body, key.current),
    retry: false,
  });
  const categoryMutation = useMutation({
    mutationFn: () =>
      api.createCategory(newCategory!.trim(), type as "INCOME" | "EXPENSE"),
    retry: false,
  });
  const source = accounts.find(
    (a) => a.id === (type === "INCOME" ? credit : debit),
  );
  const currency = source?.currency ?? transaction?.currency ?? "EUR";
  const available = accounts.filter(
    (a) =>
      a.active ||
      a.id === transaction?.debitAccountId ||
      a.id === transaction?.creditAccountId,
  );
  const matchingCategories = categories.filter(
    (c) => c.type === type && (c.active || c.id === transaction?.categoryId),
  );
  useEffect(() => {
    if (
      category &&
      !categories.some(
        (c) =>
          c.id === category &&
          c.type === type &&
          (c.active || c.id === transaction?.categoryId),
      )
    )
      setCategory("");
  }, [categories, category, type, transaction?.categoryId]);
  function switchType(value: TransactionType) {
    setType(value);
    setCategory("");
    setNewCategory(null);
    if (value === "TRANSFER" && credit === debit) setCredit("");
  }
  async function addCategory() {
    if (categoryMutation.isPending || !newCategory?.trim()) return;
    try {
      const result = await categoryMutation.mutateAsync();
      await refresh();
      setCategory(result.id);
      setNewCategory(null);
    } catch (e) {
      setError(e as Error);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guard.current || categoryMutation.isPending) return;
    try {
      const body: TransactionWrite =
        uncertain && sent.current
          ? sent.current
          : {
              type,
              amount: normalizeMoney(amount),
              currency,
              debitAccountId: type === "INCOME" ? null : debit,
              creditAccountId: type === "EXPENSE" ? null : credit,
              categoryId: type === "TRANSFER" ? null : category,
              scope:
                type === "TRANSFER"
                  ? null
                  : type === "INCOME"
                    ? (transaction?.scope ?? "PERSONAL")
                    : scope,
              operationDate: date,
              description: description.trim(),
              status,
            };
      if (
        !body.operationDate ||
        !source ||
        (type !== "TRANSFER" && !body.categoryId)
      )
        throw new Error(tr("Выберите счёт, категорию и дату."));
      if (type === "TRANSFER" && (!credit || credit === debit))
        throw new Error(tr("Выберите два разных счёта одной валюты."));
      sent.current = body;
      guard.current = true;
      setBusy(true);
      setError(null);
      await mutation.mutateAsync(body);
      await refresh();
      notify(transaction ? tr("Операция обновлена") : tr("Операция добавлена"));
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
      title={
        transaction
          ? tr("Редактировать запись")
          : type === "EXPENSE"
            ? tr("Добавить расход")
            : type === "INCOME"
              ? tr("Добавить доход")
              : tr("Перевести деньги")
      }
      description={tr("Остатки и статистика обновятся после сохранения.")}
      busy={busy || categoryMutation.isPending}
    >
      <form onSubmit={submit} className="form-stack">
        <fieldset
          disabled={busy || uncertain || categoryMutation.isPending}
          className="form-stack"
        >
          <div className="segmented" aria-label={tr("Тип операции")}>
            {(
              [
                ["EXPENSE", ArrowUpRight],
                ["INCOME", ArrowDownLeft],
                ["TRANSFER", ArrowRightLeft],
              ] as const
            )
              .filter(
                ([value]) =>
                  value !== "TRANSFER" ||
                  transaction?.type === "TRANSFER" ||
                  window.location.pathname === "/transactions",
              )
              .map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  className={type === value ? "selected" : ""}
                  onClick={() => switchType(value)}
                >
                  <Icon size={16} />
                  {typeLabels()[value]}
                </button>
              ))}
          </div>
          <Field label={tr("Сумма, {0}", currency)}>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              data-autofocus
              placeholder="0,00"
              required
              className="amount-input"
              autoComplete="off"
            />
          </Field>
          {(available.length > 1 || type === "TRANSFER") && (
            <div className={type === "TRANSFER" ? "form-grid" : ""}>
              <Field label={type === "INCOME" ? tr("На счёт") : tr("Со счёта")}>
                <Select
                  required
                  value={type === "INCOME" ? credit : debit}
                  onChange={(e) => {
                    if (type === "INCOME") setCredit(e.target.value);
                    else {
                      setDebit(e.target.value);
                      if (type === "TRANSFER") setCredit("");
                    }
                  }}
                >
                  <option value="" disabled>{" "}{tr("Выберите счёт")}{" "}</option>
                  {available.map((a) => (
                    <option key={a.id} value={a.id}>
                      {categoryName(a)} · {a.currency}
                      {!a.active ? tr(" (архив)") : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {type === "TRANSFER" && (
                <Field label={tr("На счёт")}>
                  <Select
                    required
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                  >
                    <option value="">{tr("Выберите счёт")}</option>
                    {available
                      .filter((a) => a.id !== debit && a.currency === currency)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {categoryName(a)}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
            </div>
          )}
          {available.length === 1 && type !== "TRANSFER" && (
            <p className="form-note">
              {source?.name} · {currency}
            </p>
          )}
          {type !== "TRANSFER" && (
            <>
              <Field label={tr("Категория")}>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>{" "}{tr("Выберите категорию")}{" "}</option>
                  {matchingCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(c)}
                      {!c.active ? tr(" (архив)") : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {newCategory === null ? (
                <div className="category-tools">
                  <Button
                    variant="ghost"
                    size="small"
                    className="new-category"
                    onClick={() => setNewCategory("")}
                  >
                    <Plus size={14} />{" "}{tr("Новая категория")}{" "}</Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setManageCategories(true)}
                  >{" "}{tr("Управлять категориями")}{" "}</Button>
                </div>
              ) : (
                <div className="inline-create">
                  <Input
                    aria-label={tr("Название новой категории")}
                    value={newCategory}
                    maxLength={100}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={tr("Название категории")}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={addCategory}
                    disabled={!newCategory.trim()}
                  >{" "}{tr("Добавить")}{" "}</Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setNewCategory(null)}
                  >{" "}{tr("Отмена")}{" "}</Button>
                </div>
              )}
              {type === "EXPENSE" && (
                <Field label={tr("Назначение")}>
                  <div className="segmented scope-toggle">
                    {(
                      [
                        ["PERSONAL", tr("Личное")],
                        ["HOUSEHOLD", tr("Домашнее")],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={scope === value}
                        onClick={() => setScope(value)}
                        className={scope === value ? "selected" : ""}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </>
          )}
            <Field label={tr("Описание (необязательно)")}>
              <Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr("За что эта операция?")} maxLength={2000} rows={2}/>
            </Field>
              <div className="form-grid">
                <Field label={tr("Дата операции")}>
                  <Input
                    type="date"
                    value={date}
                    min="0001-01-01"
                    max="9999-12-31"
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Field>
                {(!!transaction||status==="PENDING"||window.location.pathname==="/transactions")&&<Field label={tr("Статус")}>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                  >
                    <option value="CONFIRMED">{tr("Подтверждена")}</option>
                    <option value="PENDING">{tr("Ожидает")}</option>
                  </Select>
                </Field>}
              </div>
        </fieldset>
        <ErrorNotice error={error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Ответ не получен: операция могла сохраниться. Повтор будет отправлен с тем же ключом; новая операция не создастся. Для отредактированной записи при конфликте обновите список.")}{" "}</p>
        )}
        {status === "PENDING" && (
          <p className="form-note">{" "}{tr("Ожидающая операция не изменит баланс до подтверждения.")}{" "}</p>
        )}
        <div className="dialog-footer">
          {transaction&&!transaction.debtId&&!transaction.recurringId&&!transaction.householdPaymentId&&<DeleteMoneyOperation transaction={transaction} onDeleted={onClose}/>}
          <Button variant="secondary" onClick={onClose} disabled={busy}>{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={busy || categoryMutation.isPending}>
            {busy
              ? tr("Сохраняем…")
              : uncertain
                ? tr("Повторить запрос")
                : transaction
                  ? tr("Сохранить")
                  : window.location.pathname === "/transactions"
                    ? tr("Добавить операцию")
                    : type === "INCOME"
                      ? tr("Добавить доход")
                      : type === "EXPENSE"
                        ? tr("Добавить расход")
                        : tr("Перевести")}
          </Button>
        </div>
      </form>
      {manageCategories && type !== "TRANSFER" && (
        <CategoryManagerDialog
          type={type}
          close={() => setManageCategories(false)}
        />
      )}
    </Dialog>
  );
}
