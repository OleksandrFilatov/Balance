import { t as tr } from "@/i18n";
import { Link } from "react-router";
import { House, Landmark, UserRound, ChevronRight } from "lucide-react";
import type { MoneyOverview, MoneyPeriod } from "@/api/money";
import { formatMoney } from "@/lib/money";

export function MandatoryPayments({ money, period }: { money: MoneyOverview; period?: MoneyPeriod }) {
  if (period?.mode === "HISTORY") return null;
  const b = money.breakdown;
  const month = period?.month ?? money.until.slice(0, 7);
  const rows = [
    { key: "debts", label: tr("Платежи по долгам"), part: b.debts, href: "/debts", Icon: Landmark },
    { key: "household", label: tr("Коммуналка · моя доля"), part: b.household, href: "/household?month=" + month, Icon: House },
    { key: "personal", label: tr("Личные расходы"), part: b.personal, href: "/personal-expenses?month=" + month, Icon: UserRound },
  ];
  return <section className="mandatory-payments" aria-label={tr("Обязательные платежи по видам")} data-testid="mandatory-breakdown">
    <h2>{tr("К оплате")}{" "}{period?.mode === "FORECAST" ? tr("за месяц") : tr("до конца месяца")}</h2>
    <div className="mandatory-rows">
      {rows.map(({ key, label, part, href, Icon }) => <Link key={key} to={href} className="mandatory-row">
        <span className={"mandatory-icon " + key}><Icon size={16} /></span>
        <span>{label}</span>
        <strong data-testid={"mandatory-" + key}>{part.complete ? "" : tr("от ")}{formatMoney(part.amount, money.currency)}</strong>
        <ChevronRight size={13} aria-hidden="true" />
      </Link>)}
    </div>
    <div className="mandatory-total"><span>{b.complete ? tr("Всего обязательных платежей") : tr("Известно к оплате")}</span><strong data-testid="mandatory-total">{formatMoney(b.total, money.currency)}</strong></div>
    <p>{period?.mode === "FORECAST" ? tr("План выбранного месяца. Ранние платежи учтены в переносе.") : tr("Только неоплаченное, включая просроченное.")} {!b.complete && tr("Часть сумм нужно уточнить.")}</p>
  </section>;
}
