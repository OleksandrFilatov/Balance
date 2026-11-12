import { t as tr } from "@/i18n";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Account, Category, Transaction } from "@/api/types";
import { api } from "@/api/client";
import { useRefreshFinance } from "@/api/queries";
import { useFinanceUi } from "@/providers/finance-ui";
import { formatMoney } from "@/lib/money";
import { displayDate } from "@/lib/dates";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { ErrorNotice } from "./feedback";
const icons = {
  OPENING_ADJUSTMENT: ArrowRightLeft,
  REVERSAL: ArrowDownLeft,
  LOAN_RECEIPT: ArrowDownLeft,
  DEBT_PRINCIPAL: ArrowUpRight,
  EXPENSE: ArrowUpRight,
  INCOME: ArrowDownLeft,
  TRANSFER: ArrowRightLeft,
};
export function TransactionTable({
  transactions,
  accounts,
  categories,
  compact = false,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  compact?: boolean;
}) {
  const { openTransaction } = useFinanceUi(),
    [deleting, setDeleting] = useState<Transaction | null>(null);
  const name = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? tr("Счёт");
  const showScope = transactions.some((t) => t.type !== "INCOME");
  return (
    <>
      <div className="table-scroll">
        <table className={`transaction-table ${compact ? "compact" : ""}`}>
          <caption className="sr-only">{tr("Финансовые операции")}</caption>
          <thead>
            <tr>
              <th>{tr("Операция")}</th>
              <th className="date-column">{tr("Дата")}</th>
              <th className="account-column">{tr("Счёт")}</th>
              {showScope && <th className="scope-column">{tr("Назначение")}</th>}
              <th className="amount-column">{tr("Сумма")}</th>
              <th>
                <span className="sr-only">{tr("Действия")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const Icon = icons[t.type];
              const category =
                categories.find((c) => c.id === t.categoryId)?.name ??
                (t.type === "OPENING_ADJUSTMENT"
                  ? tr("Корректировка остатка")
                  : t.type === "LOAN_RECEIPT"
                    ? tr("Получение кредита")
                    : t.type === "DEBT_PRINCIPAL"
                      ? tr("Основной долг")
                      : tr("Перевод между счетами"));
              return (
                <tr key={t.id} data-testid="transaction-row">
                  <td>
                    <div className="transaction-name">
                      <span
                        className={`transaction-icon ${t.type.toLowerCase()}`}
                      >
                        <Icon size={18} />
                      </span>
                      <div>
                        <span className="transaction-title">
                          {t.description || category}
                        </span>
                        <span className="transaction-meta">
                          {category}
                          <span className="mobile-account">
                            {" "}
                            · {name(t.debitAccountId ?? t.creditAccountId)}
                          </span>
                          {t.status === "PENDING" && (
                            <span className="pending-badge">{tr("Ожидает")}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="date-column text-muted-foreground">
                    {displayDate(t.operationDate)}
                  </td>
                  <td className="account-column">
                    <span className="account-tag">
                      {name(t.debitAccountId ?? t.creditAccountId)}
                    </span>
                    {t.type === "TRANSFER" && (
                      <span className="transfer-target">
                        {" "}
                        → {name(t.creditAccountId)}
                      </span>
                    )}
                  </td>
                  {showScope && (
                    <td className="scope-column">
                      {t.type !== "INCOME" && (
                        <span
                          className={`scope-badge ${t.scope === "HOUSEHOLD" ? "household" : ""}`}
                        >
                          {t.scope === "HOUSEHOLD"
                            ? tr("Домашнее")
                            : t.scope === "PERSONAL"
                              ? tr("Личное")
                              : t.debtId
                                ? tr("Обязательство")
                                : tr("Между счетами")}
                        </span>
                      )}
                    </td>
                  )}
                  <td
                    className={`amount-column amount ${t.type === "INCOME" ? "income-text" : ""}`}
                  >
                    {(t.type === "OPENING_ADJUSTMENT" && t.creditAccountId) ||
                    t.type === "INCOME" ||
                    t.type === "LOAN_RECEIPT" ||
                    t.type === "REVERSAL"
                      ? "+"
                      : t.type === "EXPENSE" ||
                          t.type === "DEBT_PRINCIPAL" ||
                          t.type === "OPENING_ADJUSTMENT"
                        ? "−"
                        : ""}
                    {formatMoney(t.amount, t.currency)}
                    <span className="mobile-date">
                      {displayDate(t.operationDate)}
                    </span>
                  </td>
                  <td className="row-actions">
                    {t.type === "OPENING_ADJUSTMENT" ? (
                      <span className="form-note">{tr("Исправление")}</span>
                    ) : t.recurringId ? (
                      <Link className="text-link" to="/recurring">{" "}{tr("Расписание ↗")}{" "}</Link>
                    ) : t.debtId ? (
                      <Link className="text-link" to={"/debts/" + t.debtId}>{" "}{tr("Долг ↗")}{" "}</Link>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tr("Редактировать: {0}", t.description || category)}
                          onClick={() => openTransaction(t)}
                        >
                          <Pencil size={15} />
                        </Button>
                        {!compact && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tr("Удалить: {0}", t.description || category)}
                            onClick={() => setDeleting(t)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {deleting && (
        <DeleteTransaction
          transaction={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
function DeleteTransaction({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const { notify } = useFinanceUi(),
    refresh = useRefreshFinance(),
    guard = useRef(false),
    [busy, setBusy] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.deleteTransaction(transaction),
    retry: false,
  });
  async function remove() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      await mutation.mutateAsync();
      await refresh();
      notify(tr("Операция удалена"));
      onClose();
    } catch {
      /* Render the mutation error inside the confirmation. */
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={tr("Удалить операцию?")}
      description={tr("Она исчезнет из списка, а балансы и статистика будут пересчитаны.")}
    >
      <div className="delete-summary">
        <strong>{transaction.description || tr("Финансовая операция")}</strong>
        <span>
          {formatMoney(transaction.amount, transaction.currency)} ·{" "}
          {displayDate(transaction.operationDate)}
        </span>
      </div>
      <ErrorNotice error={mutation.error} />
      <div className="dialog-footer">
        <Button variant="secondary" onClick={onClose} disabled={busy} autoFocus>{" "}{tr("Отмена")}{" "}</Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          {busy ? tr("Удаляем…") : tr("Удалить операцию")}
        </Button>
      </div>
    </Dialog>
  );
}
