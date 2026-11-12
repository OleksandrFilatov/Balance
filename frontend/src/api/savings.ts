import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
export interface GoalInput {
  name: string;
  description: string;
  target: string;
  currency: string;
  deadline: string | null;
  monthlyPlan: string;
}
export interface Goal extends GoalInput {
  id: string;
  status: string;
  version: number;
  reserved: string;
  createdAt: string;
  forecast: {
    remaining: string;
    percent: string;
    requiredMonthly: string | null;
    monthsNeeded: string | null;
    estimatedDate: string | null;
    monthsUntilDeadline: string | null;
    plannedToDate: string;
    actual: string;
    variance: string;
    overdue: boolean;
  };
}
export interface Coverage {
  accountId: string;
  name: string;
  currency: string;
  balance: string;
  reserved: string;
  free: string;
  underfunded: boolean;
}
export interface SavingsOverview {
  reserved: string;
  free: string;
  balance: string;
  activeGoals: string;
  accounts: Coverage[];
}
export interface History {
  content: {
    id: string;
    accountId: string | null;
    amount: string;
    action: string;
    note: string;
    createdAt: string;
  }[];
  page: number;
  size: number;
  totalElements: number;
}
export const savingsApi = {
  create: (g: GoalInput) => write<Goal>("/savings", "POST", g),
  update: (g: Goal, body: GoalInput, status: string) =>
    write<Goal>("/savings/" + g.id, "PUT", {
      goal: body,
      status,
      version: g.version,
    }),
  remove: (g: Goal) =>
    write<void>("/savings/" + g.id + "?version=" + g.version, "DELETE"),
  fund: (
    g: Goal,
    mode: string,
    accountId: string,
    amount: string,
    note: string,
    key: string,
    toGoalId: string,
  ) =>
    mode === "reallocate"
      ? write<void>(
          "/savings/reallocate",
          "POST",
          { fromGoalId: g.id, toGoalId, accountId, amount, note },
          key,
        )
      : write<void>(
          "/savings/" + g.id + "/" + mode,
          "POST",
          { accountId, amount, note },
          key,
        ),
};
export function useGoals() {
  return useQuery({
    queryKey: [...financeKey, "savings", "goals"],
    queryFn: ({ signal }) => request<Goal[]>("/savings", { signal }),
  });
}
export function useSavings() {
  return useQuery({
    queryKey: [...financeKey, "savings", "overview"],
    queryFn: ({ signal }) =>
      request<SavingsOverview>("/savings/overview", { signal }),
  });
}
export function useGoal(id: string) {
  return useQuery({
    queryKey: [...financeKey, "savings", id],
    queryFn: ({ signal }) => request<Goal>("/savings/" + id, { signal }),
  });
}
export function useAllocations(id: string) {
  return useQuery({
    queryKey: [...financeKey, "savings", "allocations", id],
    enabled: id !== "new",
    queryFn: ({ signal }) =>
      request<Record<string, string>>("/savings/" + id + "/allocations", {
        signal,
      }),
  });
}
export function useGoalHistory(id: string, page: number) {
  return useQuery({
    queryKey: [...financeKey, "savings", "history", id, page],
    queryFn: ({ signal }) =>
      request<History>("/savings/" + id + "/history?page=" + page, { signal }),
  });
}
