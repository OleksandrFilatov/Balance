export type Money = string;
export type AccountType = "BANK" | "CASH" | "SAVINGS";
export type UserTransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransactionType =
  | UserTransactionType
  | "LOAN_RECEIPT"
  | "DEBT_PRINCIPAL"
  | "REVERSAL"
  | "OPENING_ADJUSTMENT";
export type Scope = "PERSONAL" | "HOUSEHOLD";
export type Status = "PENDING" | "CONFIRMED";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: Money;
  createdAt: string;
  active: boolean;
  version: number;
}
export interface AccountCreate {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: Money;
}
export interface AccountUpdate {
  name: string;
  type: AccountType;
  active: boolean;
  version: number;
}
export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  active: boolean;
  version: number;
}
export interface Balance {
  accountId: string;
  currency: string;
  balance: Money;
}
export interface Balances {
  accounts: Balance[];
  totalsByCurrency: Record<string, Money>;
}
export interface TransactionWrite {
  type: TransactionType;
  amount: Money;
  currency: string;
  debitAccountId: string | null;
  creditAccountId: string | null;
  categoryId: string | null;
  scope: Scope | null;
  operationDate: string;
  description: string;
  status: Status;
}
export interface Transaction extends TransactionWrite {
  debtId: string | null;
  recurringId: string | null;
  householdPaymentId: string | null;
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface Filters {
  excludeAdjustments?: boolean;
  excludeReversed?: boolean;
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  scope?: string;
  type?: string;
  status?: string;
  page?: number;
  size?: number;
}
export interface Summary {
  from: string;
  to: string;
  currency: string;
  income: Money;
  expense: Money;
  net: Money;
  personalExpense: Money;
  householdExpense: Money;
}
export interface Analytics {
  from: string;
  to: string;
  currency: string;
  daily: { date: string; amount: Money }[];
  categories: { categoryId: string; name: string; amount: Money }[];
}
