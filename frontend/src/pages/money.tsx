import { t as tr } from "@/i18n";
import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMoneyPeriod, useDisplayCurrency } from "@/api/money";
import { useAccounts, useCategories, useTransactions } from "@/api/queries";
import { calendarRange } from "@/lib/calendar-dates";
import { formatMoney } from "@/lib/money";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ErrorNotice, Loading } from "@/components/feedback";
import { MoneyList } from "@/components/money-list";
import {PersonalAllowance} from "@/components/personal-allowance";
import {BalanceRemainder} from "@/components/balance-remainder";
import {MoneyMonth,MoneyPeriodNote,useMoneyMonth} from "@/components/money-month";
import {BalanceWater} from "@/components/balance-water";
import {MandatoryPayments} from "@/components/mandatory-payments";
import { useFinanceUi } from "@/providers/finance-ui";
export function MoneyPage() {
  const [params] = useSearchParams();
  const selected=useMoneyMonth(),range=calendarRange(selected.month+"-01","month");
  const { currency, currencies, setCurrency } = useDisplayCurrency(),
    period = useMoneyPeriod(currency,selected.month),
    accounts = useAccounts(),
    categories = useCategories(),
    [page, setPage] = useState(0),
    history = useTransactions({ page, size: 20,from:range.from,to:range.to,excludeReversed:true,excludeAdjustments:true }),
    { openTransaction } = useFinanceUi();
  const query={data:period.data?.overview,error:period.error,refetch:period.refetch},mode=period.data?.mode??"CURRENT";
  const matching =
    accounts.data?.filter((a) => a.active && a.currency === currency) ?? [];
  const accountId =
    matching.find((a) => a.id === query.data?.defaultAccountId)?.id ??
    (matching.length === 1 ? matching[0].id : undefined);
  return (
    <>
      <PageHeading
        title={tr("Мои деньги")}
        description={tr("Что пришло, что потрачено и что осталось.")}
      />
      <MoneyMonth {...selected} onChange={month=>{setPage(0);selected.setMonth(month);}}/>
      <div className="money-actions">
        <Button
          onClick={() =>
            openTransaction(undefined, accountId, { type: "INCOME" })
          }
        >
          <ArrowDownLeft size={18} />{" "}{tr("Добавить доход")}{" "}</Button>
        <Button
          variant="secondary"
          onClick={() =>
            openTransaction(undefined, accountId, { type: "EXPENSE" })
          }
        >
          <ArrowUpRight size={18} />{" "}{tr("Добавить расход")}{" "}</Button>
        {currencies.length > 1 && (
          <Select
            aria-label={tr("Валюта моих денег")}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: 100 }}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </div>
      {query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : !query.data ? (
        <Loading />
      ) : (
        <>
          <div className={"daily-metrics"+(mode==="HISTORY"?" money-history-metrics":"")}>
            <Card className="daily-total money-balance-surface">
              <BalanceWater/>
              <span>{mode==="FORECAST"?tr("Прогноз перед платежами"):mode==="HISTORY"?tr("Баланс на конец месяца"):tr("Всего денег")} · {currency}</span>
              <strong className={mode==="FORECAST"&&period.data?.opening===null?"balance-period-empty":""} data-testid="money-balance">
                {mode==="FORECAST"&&period.data?.opening===null?tr("Уточните план"):formatMoney(query.data.balance, currency)}
              </strong>
              <BalanceRemainder key={selected.month} money={query.data} period={period.data} testId="money-after-mandatory"/>
            </Card>
            <Card className="daily-metric income-metric">
              <span>{mode==="FORECAST"?tr("Ожидается в этом месяце"):tr("Получено в этом месяце")}</span>
              <strong data-testid="money-income">
                {formatMoney(query.data.income, currency)}
              </strong>
              {mode!=="FORECAST"&&<div className="money-actual-expense"><span>{tr("Потрачено в этом месяце")}</span><strong data-testid="money-expense">{formatMoney(query.data.expense,currency)}</strong></div>}
            </Card>
            {mode!=="HISTORY"&&<Card className="daily-metric obligations-card"><MandatoryPayments money={query.data} period={period.data}/></Card>}
          </div>
          {mode==="CURRENT"&&<details className="daily-details compact-details">
            <summary>{tr("Как считается остаток после платежей")}</summary>
            <p>{" "}{tr("Текущие деньги минус")}{" "}{formatMoney(query.data.mandatory, currency)}{" "}{" "}{tr("неоплаченных планов до")}{" "}{query.data.until}{tr(", включая просроченные. Будущие доходы не прибавляются. Коммуналка учитывается только в вашей доле: постоянные платежи — по зарплатам, дополнительные — 50/50. Личные платежи и долги учитываются полностью. Резервы накоплений повторно не вычитаются. Для долга с единственным сроком без месячного платежа учитывается весь оставшийся долг к этой дате.")}{" "}</p>
          </details>}
          {period.data&&<MoneyPeriodNote period={period.data}/>}
          {query.data.unknownObligations !== "0" && (
            <p role="status" className="savings-warning">{" "}{tr("Уточните суммы обязательств или зарплаты для распределения коммуналки. Пока точный остаток после ваших платежей не определён.")}{" "}</p>
          )}
        </>
      )}
      {currency==="EUR"&&<details className="daily-details personal-plan-details" open={params.get("view")==="personal"?true:undefined}>
        <summary>{tr("Деньги для себя в месяц")}</summary>
        <PersonalAllowance month={selected.month} accountId={accountId} onMonthChange={month=>{setPage(0);selected.setMonth(month);}}/>
      </details>}
      <Card className="daily-panel" data-testid="money-history">
        <div className="panel-heading">
          <h2>{tr("Операции выбранного месяца")}</h2>
        </div>
        <ErrorNotice
          error={history.error ?? accounts.error ?? categories.error}
        />
        {history.data && accounts.data && categories.data ? (
          <>
            <MoneyList
              transactions={history.data.content}
              accounts={accounts.data}
              categories={categories.data}
              allowDelete
            />
            {!history.data.content.length && (
              <p className="quiet-empty">{" "}{tr("Пока нет записей. Добавьте первый доход или расход.")}{" "}</p>
            )}
            {history.data.totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="ghost"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />{" "}{tr("Назад")}{" "}</Button>
                <span>
                  {page + 1} / {history.data.totalPages}
                </span>
                <Button
                  variant="ghost"
                  disabled={page + 1 >= history.data.totalPages}
                  onClick={() => setPage(page + 1)}
                >{" "}{tr("Далее")}{" "}<ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        ) : (
          !history.error && <Loading />
        )}
      </Card>
    </>
  );
}
