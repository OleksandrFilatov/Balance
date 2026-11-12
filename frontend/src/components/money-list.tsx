import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { Link } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ChevronRight,
} from "lucide-react";
import type { Transaction, Category, Account } from "@/api/types";
import { formatMoney } from "@/lib/money";
import { displayDate } from "@/lib/dates";
import { useFinanceUi } from "@/providers/finance-ui";
import {DeleteMoneyOperation} from "./recurring-actions";
export function MoneyList({
  transactions,
  categories,
  accounts,
  allowDelete=false,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  allowDelete?:boolean;
}) {
  const { openTransaction } = useFinanceUi();
  return (
    <div className="money-list">
      {transactions.map((t) => {
        const adjustment = t.type === "OPENING_ADJUSTMENT",
          incoming =
            t.type === "INCOME" ||
            t.type === "LOAN_RECEIPT" ||
            t.type === "REVERSAL" ||
            (adjustment && !!t.creditAccountId);
        const category =
          categoryName(categories.find((c) => c.id === t.categoryId)) ??
          (adjustment
            ? tr("Корректировка остатка")
            : t.type === "EXPENSE"
              ? tr("Без категории")
              : t.type === "INCOME"
                ? tr("Доход")
            : t.type === "TRANSFER"
              ? tr("Перевод")
              : t.type === "DEBT_PRINCIPAL"
                ? tr("Погашение долга")
                : t.type === "REVERSAL"
                  ? tr("Возврат платежа")
                  : tr("Получение займа"));
        const Icon =
          t.type === "TRANSFER" || adjustment
            ? ArrowRightLeft
            : incoming
              ? ArrowDownLeft
              : ArrowUpRight;
        const content = (
          <>
            <span className={"entry-icon " + (incoming ? "income" : "")}>
              <Icon size={19} />
            </span>
            <span className="entry-description">
              <strong>{t.description || category}</strong>
              <small>
                {category} · {displayDate(t.operationDate)}
                {t.type === "EXPENSE" && t.scope === "HOUSEHOLD"
                  ? tr(" · Дом")
                  : ""}
                {t.status === "PENDING" ? tr(" · Ожидает") : ""}
                {accounts.length > 1
                  ? " · " +
                    (accounts.find(
                      (a) => a.id === (t.debitAccountId ?? t.creditAccountId),
                    )?.name ?? "")
                  : ""}
              </small>
            </span>
            <span className="entry-value">
              {t.type === "TRANSFER" ? "" : incoming ? "+" : "−"}
              {formatMoney(t.amount, t.currency)}
            </span>
            <ChevronRight size={15} />
          </>
        );
        const link = t.householdPaymentId ? "/household?payment="+t.householdPaymentId : t.debtId
          ? "/debts/" + t.debtId
          : t.recurringId
            ? "/recurring?history="+t.recurringId
            : adjustment
              ? "/money"
              : null;
        const row=link ? (
          <Link
            key={t.id}
            to={link}
            className="money-entry"
            data-testid="money-entry"
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            key={t.id}
            className="money-entry"
            data-testid="money-entry"
            onClick={() => openTransaction(t)}
          >
            {content}
          </button>
        );
        const removable=!t.debtId&&!t.recurringId&&!t.householdPaymentId&&!adjustment;
        return allowDelete&&removable?<div className="money-entry-row" key={t.id}>{row}<DeleteMoneyOperation transaction={t} compact/></div>:row;
      })}
    </div>
  );
}
