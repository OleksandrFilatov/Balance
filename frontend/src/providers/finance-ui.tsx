import { t as tr } from "@/i18n";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";
import type { Account, Transaction } from "@/api/types";
import { AccountForm } from "@/components/account-form";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
interface Actions {
  openAccount: (account?: Account) => void;
  openTransaction: (
    transaction?: Transaction,
    accountId?: string,
    defaults?: {
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      scope?: "PERSONAL" | "HOUSEHOLD";
      categoryId?: string;
      operationDate?: string;
    },
  ) => void;
  notify: (message: string) => void;
}
const ActionsContext = createContext<Actions | null>(null);
export function FinanceUiProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | "new" | null>(null);
  const [transaction, setTransaction] = useState<{
    value?: Transaction;
    accountId?: string;
    defaults?: {
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      scope?: "PERSONAL" | "HOUSEHOLD";
      categoryId?: string;
      operationDate?: string;
    };
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string) => setToast({ message, id: Date.now() });
  return (
    <ActionsContext.Provider
      value={{
        openAccount: (value) => setAccount(value ?? "new"),
        openTransaction: (value, accountId, defaults) =>
          setTransaction({ value, accountId, defaults }),
        notify,
      }}
    >
      {children}
      {account && (
        <AccountForm
          account={account === "new" ? undefined : account}
          onClose={() => setAccount(null)}
        />
      )}
      {transaction && (
        <TransactionForm
          transaction={transaction.value}
          accountId={transaction.accountId}
          defaults={transaction.defaults}
          onClose={() => setTransaction(null)}
        />
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="toast">
            <CheckCircle2 size={20} />
            <span>{toast.message}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={tr("Закрыть уведомление")}
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </Button>
          </div>
        )}
      </div>
    </ActionsContext.Provider>
  );
}
export function useFinanceUi() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error("Missing FinanceUiProvider");
  return value;
}
