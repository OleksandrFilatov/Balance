import { t as tr } from "@/i18n";
import { Link } from "react-router";
import { ArrowDownLeft, ArrowUpRight, Wallet, Landmark, PiggyBank, Plus } from "lucide-react";
import { useMoneyPeriod, useDisplayCurrency } from "@/api/money";
import { useDebtOverview } from "@/api/debts";
import { useSavings } from "@/api/savings";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Loading } from "@/components/feedback";
import { useFinanceUi } from "@/providers/finance-ui";
import {DashboardInsights} from "@/components/dashboard-insights";
import {BalanceRemainder} from "@/components/balance-remainder";
import {SavingsAdviser} from "@/components/savings-adviser";
import {MoneyMonth,MoneyPeriodNote,useMoneyMonth} from "@/components/money-month";
import {BalanceWater} from "@/components/balance-water";
import {MandatoryPayments} from "@/components/mandatory-payments";

export function DashboardPage() {
  const { currency, currencies, setCurrency } = useDisplayCurrency();
  const selected=useMoneyMonth(),period=useMoneyPeriod(currency,selected.month);
  const money={data:period.data?.overview,error:period.error,refetch:period.refetch},debts = useDebtOverview(), savings = useSavings();
  const mode=period.data?.mode??"CURRENT";
  const { openTransaction } = useFinanceUi();
  return <div className="overview-studio">
    <header className="studio-heading">
      <div><h1>{tr("Мои финансы")}</h1><p>{tr("Деньги, расходы и ваши цели.")}</p></div>
    </header>
    <MoneyMonth {...selected} onChange={selected.setMonth}/>
    {currencies.length > 1 && <Select className="home-currency" aria-label={tr("Валюта обзора")} value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c}>{c}</option>)}</Select>}
    <ErrorNotice error={money.error} retry={()=>void money.refetch()}/>
    {!money.data ? !money.error&&<Loading label={tr("Загружаем финансовый обзор")}/> : <div className="studio-finances">
      <section className="studio-balance" aria-label={tr("Мои деньги")}>
        <BalanceWater/>
        <div className="balance-topline"><span><Wallet size={17}/>{mode==="FORECAST"?tr("Прогноз перед платежами"):mode==="HISTORY"?tr("Баланс на конец месяца"):tr("Общий баланс")}</span><span className="currency-pill">{currency}</span></div>
        <strong className={mode==="FORECAST"&&period.data?.opening===null?"balance-period-empty":formatMoney(money.data.balance,currency).length>15?"balance-long":""} data-testid="total-balance">{mode==="FORECAST"&&period.data?.opening===null?tr("Уточните план"):formatMoney(money.data.balance,currency)}</strong>
        <div className="balance-caption"><span className="balance-status-dot"/>{mode==="FORECAST"?tr("Перенос остатка + ожидаемые поступления"):mode==="HISTORY"?tr("По сохранённым операциям"):tr("На ваших счетах сейчас")}</div>
        <BalanceRemainder key={selected.month} money={money.data} period={period.data} testId="dashboard-after-mandatory"/>
        <div className="balance-actions">
          <Button onClick={()=>openTransaction(undefined,undefined,{type:"INCOME"})}><Plus size={17}/>{tr("Добавить доход")}</Button>
          <Button variant="secondary" onClick={()=>openTransaction(undefined,undefined,{type:"EXPENSE"})}><ArrowUpRight size={17}/>{tr("Добавить расход")}</Button>
          <Link to={"/money?month="+selected.month} aria-label={tr("Перейти в мои деньги")} className="balance-open"><ArrowUpRight size={21}/></Link>
        </div>
      </section>
      <Card className="studio-month"><div className="studio-card-label">{mode==="CURRENT"?tr("Этот месяц"):tr("Выбранный месяц")}<span>{mode==="FORECAST"?tr("План, не реальные списания"):tr("Доходы и расходы")}</span></div>
        <div className="studio-flow"><span className="flow-symbol"><ArrowDownLeft size={22}/></span><div><span>{mode==="FORECAST"?tr("Ожидается доходов"):tr("Доходы")}</span><strong data-testid="monthly-income">{formatMoney(money.data.income,currency)}</strong></div><Link to={"/money?month="+selected.month} aria-label={tr("Посмотреть доходы")}><ArrowUpRight size={18}/></Link></div>
        {mode!=="FORECAST"&&<div className="studio-flow"><span className="flow-symbol flow-out"><ArrowUpRight size={22}/></span><div><span>{tr("Расходы")}</span><strong data-testid="monthly-expense">{formatMoney(money.data.expense,currency)}</strong></div><Link to={"/money?month="+selected.month} aria-label={tr("Посмотреть расходы")}><ArrowUpRight size={18}/></Link></div>}
        <MandatoryPayments money={money.data} period={period.data}/>
      </Card>
    </div>}
    {period.data&&<MoneyPeriodNote period={period.data}/>}
    <div className="studio-snapshot">
      <Link className="snapshot-card" to="/savings"><span className="snapshot-icon"><PiggyBank size={20}/></span><div><span>{tr("Отложено на цели сейчас · EUR")}</span><strong data-testid="savings-total">{savings.data?formatMoney(savings.data.reserved):savings.error?tr("Не удалось загрузить"):"—"}</strong></div><ArrowUpRight className="snapshot-arrow" size={18}/></Link>
      <Link className="snapshot-card" to="/debts"><span className="snapshot-icon"><Landmark size={20}/></span><div><span>{tr("Остаток долгов сейчас · EUR")}</span><strong data-testid="debt-total">{debts.data?formatMoney(debts.data.remaining):debts.error?tr("Не удалось загрузить"):"—"}</strong></div><ArrowUpRight className="snapshot-arrow" size={18}/></Link>
    </div>
    <ErrorNotice error={savings.error??debts.error}/>
    {money.data?.unknownObligations!==undefined&&money.data.unknownObligations!=="0"&&<Link className="form-note" to={"/household?month="+selected.month}>{tr("Уточните зарплаты или суммы обязательств, чтобы увидеть личный остаток →")}</Link>}
    <DashboardInsights/>
    {currency==="EUR"&&mode==="CURRENT"&&<SavingsAdviser/>}
    {savings.data?.accounts.some(a=>a.underfunded)&&<Link className="savings-warning" to="/savings">{tr("Часть накоплений не обеспечена деньгами на счёте. Проверить →")}</Link>}
  </div>;
}
