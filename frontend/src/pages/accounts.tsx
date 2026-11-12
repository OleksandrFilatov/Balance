import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
﻿import {
  ArrowRight,
  Banknote,
  Landmark,
  Pencil,
  Plus,
  Vault,
} from "lucide-react";
import { Link } from "react-router";
import { useAccounts, useBalances } from "@/api/queries";
import { formatMoney } from "@/lib/money";
import { useFinanceUi } from "@/providers/finance-ui";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNotice, Loading } from "@/components/feedback";
import { DefaultAccount } from "@/components/default-account";
const icons = { BANK: Landmark, CASH: Banknote, SAVINGS: Vault };
const labels = () => ({
  BANK: tr("Банковский счёт"),
  CASH: tr("Наличные"),
  SAVINGS: tr("Сберегательный счёт"),
});
export function AccountsPage() {
  const accounts = useAccounts(),
    balances = useBalances(),
    ui = useFinanceUi();
  const accountData = accounts.data,
    balanceData = balances.data;
  const error = accounts.error ?? balances.error;
  return (
    <>
      <PageHeading
        title={tr("Мои счета")}
        description={tr("Все места, где хранятся ваши деньги.")}
        action={tr("Новый счёт")}
        onAction={() => ui.openAccount()}
      />
      <DefaultAccount />
      {error ? (
        <ErrorNotice
          error={error}
          retry={() => {
            void accounts.refetch();
            void balances.refetch();
          }}
        />
      ) : !accountData || !balanceData ? (
        <Loading />
      ) : (
        <>
          <div className="accounts-overview">
            <span className="section-caption">{tr("Общий баланс по валютам")}</span>
            <div>
              {Object.entries(balanceData.totalsByCurrency).map(
                ([currency, amount]) => (
                  <strong key={currency}>
                    {formatMoney(amount, currency)}
                  </strong>
                ),
              )}
              {!accountData.length && <span>{tr("Счета пока не добавлены")}</span>}
            </div>
          </div>
          {accountData.length ? (
            <div className="accounts-grid">
              {accountData.map((account, index) => {
                const Icon = icons[account.type],
                  balance = balanceData.accounts.find(
                    (b) => b.accountId === account.id,
                  );
                return (
                  <Card
                    key={account.id}
                    className={`account-card ${!account.active ? "archived" : ""}`}
                    data-testid="account-card"
                  >
                    <div className="account-card-top">
                      <span className={`bank-icon bank-color-${index % 3}`}>
                        <Icon size={23} />
                      </span>
                      <span className="soft-badge">{account.currency}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => ui.openAccount(account)}
                        aria-label={tr("Редактировать счёт {0}", account.name)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </div>
                    <div>
                      <h2>{categoryName(account)}</h2>
                      <p className="account-type">
                        {labels()[account.type]}
                        {!account.active && tr(" · В архиве")}
                      </p>
                    </div>
                    <strong
                      className="account-balance"
                      data-testid="account-balance"
                    >
                      {balance
                        ? formatMoney(balance.balance, account.currency)
                        : tr("Недоступен")}
                    </strong>
                    <div className="account-card-footer">
                      <Link to={"/transactions?accountId=" + account.id}>{" "}{tr("Операции по счёту")}{" "}<ArrowRight size={16} />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          ui.openTransaction(undefined, account.id)
                        }
                        disabled={!account.active}
                        aria-label={tr("Добавить операцию: {0}", account.name)}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              <button
                className="add-account-card"
                onClick={() => ui.openAccount()}
              >
                <span>
                  <Plus size={25} />
                </span>
                <strong>{tr("Добавить счёт")}</strong>
                <p>{tr("Банк, наличные или сбережения")}</p>
              </button>
            </div>
          ) : (
            <Card>
              <EmptyState
                title={tr("Ваш первый счёт")}
                description={tr("Добавьте банковский счёт или наличные и укажите реальный начальный остаток.")}
                action={tr("Создать счёт")}
                onAction={() => ui.openAccount()}
              />
            </Card>
          )}
          <p className="page-note">{" "}{tr("Баланс рассчитывается по подтверждённым операциям. Переводы между вашими счетами не меняют общий капитал.")}{" "}</p>
        </>
      )}
    </>
  );
}
