import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
﻿import { useSearchParams } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RotateCcw,
  ArrowRightLeft,
} from "lucide-react";
import { useAccounts, useCategories, useTransactions } from "@/api/queries";
import { useEffect } from "react";
import { useFinanceUi } from "@/providers/finance-ui";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorNotice, Loading } from "@/components/feedback";
import { TransactionTable } from "@/components/transaction-table";
export function TransactionsPage() {
  const [params, setParams] = useSearchParams(),
    accounts = useAccounts(),
    categories = useCategories(),
    ui = useFinanceUi();
  const pageValue = Number(params.get("page") ?? 0),
    page = Number.isSafeInteger(pageValue) && pageValue >= 0 ? pageValue : 0;
  const filters = {
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    accountId: params.get("accountId") ?? "",
    categoryId: params.get("categoryId") ?? "",
    scope: params.get("type") === "INCOME" ? "" : (params.get("scope") ?? ""),
    type: params.get("type") ?? "",
    status: params.get("status") ?? "",
    page,
    size: 20,
  };
  const invalidDates = !!(
    filters.from &&
    filters.to &&
    filters.from > filters.to
  );
  const transactions = useTransactions(filters, !invalidDates);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === "type" && value === "INCOME") next.delete("scope");
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  const transactionData = transactions.data,
    accountData = accounts.data,
    categoryData = categories.data;
  useEffect(() => {
    if (!transactionData) return;
    const lastPage = Math.max(0, transactionData.totalPages - 1);
    if (page <= lastPage) return;
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (lastPage) next.set("page", String(lastPage));
        else next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [transactionData, page, setParams]);
  const error = accounts.error ?? categories.error ?? transactions.error;
  const hasFilters = Array.from(params.keys()).some((key) => key !== "page");
  return (
    <>
      <PageHeading
        title={tr("Операции")}
        description={tr("Каждое движение денег — на своём месте.")}
        action={tr("Новая операция")}
        onAction={() =>
          ui.openTransaction(undefined, filters.accountId || undefined)
        }
      />
      <Card className="filters-panel">
        <div className="filters-heading">
          <span>
            <ListFilter size={16} />{" "}{tr("Фильтры")}{" "}</span>
          {hasFilters && (
            <Button variant="ghost" size="small" onClick={() => setParams({})}>
              <RotateCcw size={14} />{" "}{tr("Сбросить")}{" "}</Button>
          )}
        </div>
        <div className="filters-grid">
          <Field label={tr("С даты")}>
            <Input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={filters.from}
              onChange={(e) => change("from", e.target.value)}
            />
          </Field>
          <Field label={tr("По дату")}>
            <Input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={filters.to}
              onChange={(e) => change("to", e.target.value)}
            />
          </Field>
          <Field label={tr("Счёт")}>
            <Select
              value={filters.accountId}
              onChange={(e) => change("accountId", e.target.value)}
            >
              <option value="">{tr("Все счета")}</option>
              {accountData?.map((a) => (
                <option key={a.id} value={a.id}>
                  {categoryName(a)}
                  {!a.active ? tr(" (архив)") : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tr("Категория")}>
            <Select
              value={filters.categoryId}
              onChange={(e) => change("categoryId", e.target.value)}
            >
              <option value="">{tr("Все категории")}</option>
              {categoryData?.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryName(c)} · {c.type === "INCOME" ? tr("доход") : tr("расход")}
                </option>
              ))}
            </Select>
          </Field>
          {filters.type !== "INCOME" && (
            <Field label={tr("Назначение")}>
              <Select
                value={filters.scope}
                onChange={(e) => change("scope", e.target.value)}
              >
                <option value="">{tr("Любое")}</option>
                <option value="PERSONAL">{tr("Личное")}</option>
                <option value="HOUSEHOLD">{tr("Домашнее")}</option>
              </Select>
            </Field>
          )}
          <Field label={tr("Тип")}>
            <Select
              value={filters.type}
              onChange={(e) => change("type", e.target.value)}
            >
              <option value="">{tr("Все операции")}</option>
              <option value="INCOME">{tr("Доходы")}</option>
              <option value="EXPENSE">{tr("Расходы")}</option>
              <option value="TRANSFER">{tr("Переводы")}</option>
              <option value="LOAN_RECEIPT">{tr("Получение кредита")}</option>
              <option value="DEBT_PRINCIPAL">{tr("Основной долг")}</option>
            </Select>
          </Field>
          <Field label={tr("Статус")}>
            <Select
              value={filters.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">{tr("Все статусы")}</option>
              <option value="CONFIRMED">{tr("Подтверждены")}</option>
              <option value="PENDING">{tr("Ожидают")}</option>
            </Select>
          </Field>
        </div>
        {invalidDates && (
          <p role="alert" className="validation-error">{" "}{tr("Начало периода не может быть позже окончания.")}{" "}</p>
        )}
      </Card>
      {error ? (
        <ErrorNotice
          error={error}
          retry={() => {
            void transactions.refetch();
            void accounts.refetch();
            void categories.refetch();
          }}
        />
      ) : invalidDates ? null : !transactionData ||
        !accountData ||
        !categoryData ? (
        <Loading label={tr("Загружаем операции")} />
      ) : (
        <Card className="transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>{tr("История операций")}</h2>
              <p>
                {transactionData.totalElements
                  ? tr("Найдено операций: {0}", transactionData.totalElements)
                  : tr("Список операций за выбранный период")}
              </p>
            </div>
            <span className="soft-badge">{tr("По дате ↓")}</span>
          </div>
          {transactionData.content.length ? (
            <>
              <TransactionTable
                transactions={transactionData.content}
                accounts={accountData}
                categories={categoryData}
              />
              <div className="pagination">
                <span>{" "}{tr("Страница")}{" "}{page + 1}{" "}{tr("из")}{" "}{transactionData.totalPages}
                </span>
                <div>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={page === 0}
                    onClick={() => change("page", String(page - 1))}
                  >
                    <ChevronLeft size={16} />{" "}{tr("Назад")}{" "}</Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={page + 1 >= transactionData.totalPages}
                    onClick={() => change("page", String(page + 1))}
                  >{" "}{tr("Далее")}{" "}<ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title={hasFilters ? tr("Ничего не найдено") : tr("Пока нет операций")}
              description={
                hasFilters
                  ? tr("Попробуйте изменить даты или другие условия поиска.")
                  : tr("Добавьте доход, расход или перевод между счетами.")
              }
              action={hasFilters ? tr("Сбросить фильтры") : tr("Добавить операцию")}
              onAction={() =>
                hasFilters ? setParams({}) : ui.openTransaction()
              }
              icon={<ArrowRightLeft size={25} />}
            />
          )}
        </Card>
      )}
    </>
  );
}
