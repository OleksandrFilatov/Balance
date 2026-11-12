import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
export type BudgetScope = "PERSONAL" | "HOUSEHOLD";
export interface BudgetPlan {
  plannedIncome: string;
  plannedExpense: string;
  limits: { categoryId: string; amount: string }[];
}
export interface Budget {
  id: string;
  month: string;
  scope: BudgetScope;
  currency: string;
  plan: BudgetPlan;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface BudgetCategory {
  categoryId: string;
  name: string;
  active: boolean;
  planned: string | null;
  actual: string;
  remaining: string | null;
  usagePercent: string | null;
  deviation: string | null;
  exceeded: boolean;
}
export interface BudgetReport {
  month: string;
  scope: BudgetScope;
  currency: string;
  budget: Budget | null;
  actualIncome: string;
  actualExpense: string;
  remaining: string | null;
  usagePercent: string | null;
  incomeDeviation: string | null;
  expenseDeviation: string | null;
  allocatedPlan: string;
  unallocatedPlan: string | null;
  expensesWithoutLimit: string;
  exceeded: boolean;
  categories: BudgetCategory[];
}
export const budgetsApi = {
  create: (month: string, scope: BudgetScope, plan: BudgetPlan) =>
    write<Budget>("/budgets", "POST", { month, scope, plan }),
  update: (budget: Budget, plan: BudgetPlan) =>
    write<Budget>("/budgets/" + budget.id, "PUT", {
      version: budget.version,
      plan,
    }),
  copy: (sourceMonth: string, targetMonth: string, scope: BudgetScope) =>
    write<Budget>("/budgets/copy", "POST", { sourceMonth, targetMonth, scope }),
};
export function useBudget(month: string, scope: BudgetScope, categoryId = "") {
  return useQuery({
    queryKey: [...financeKey, "budget", month, scope, categoryId],
    queryFn: ({ signal }) =>
      request<BudgetReport>(
        "/budgets?" +
          new URLSearchParams({
            month,
            scope,
            ...(categoryId ? { categoryId } : {}),
          }),
        { signal },
      ),
  });
}
export function useBudgetHistory(scope: BudgetScope) {
  return useQuery({
    queryKey: [...financeKey, "budget-history", scope],
    queryFn: ({ signal }) =>
      request<Budget[]>("/budgets/history?scope=" + scope, { signal }),
  });
}
