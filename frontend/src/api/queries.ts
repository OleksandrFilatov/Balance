import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError,request } from "./client";
import type { Filters } from "./types";
export const financeKey = ["finance"] as const;
export const queryRetry = (count: number, error: Error) =>
  count < 1 &&
  error instanceof ApiError &&
  (error.status === 0 || error.status >= 500);
export function useAccounts() {
  return useQuery({
    queryKey: [...financeKey, "accounts"],
    queryFn: ({ signal }) => api.accounts(signal),
  });
}
export function useBalances() {
  return useQuery({
    queryKey: [...financeKey, "balances"],
    queryFn: ({ signal }) => api.balances(signal),
  });
}
export function useCategories() {
  return useQuery({
    queryKey: [...financeKey, "categories"],
    queryFn: ({ signal }) => api.categories(signal),
  });
}
export function useTransactions(filter: Filters, enabled = true) {
  return useQuery({
    queryKey: [...financeKey, "transactions", filter],
    queryFn: ({ signal }) => api.transactions(filter, signal),
    enabled,
  });
}
export function useSummary(from: string, to: string, currency: string) {
  return useQuery({
    queryKey: [...financeKey, "summary", from, to, currency],
    queryFn: ({ signal }) => api.summary(from, to, currency, signal),
  });
}
export function useAnalytics(from: string, to: string, currency: string) {
  return useQuery({
    queryKey: [...financeKey, "analytics", from, to, currency],
    queryFn: ({ signal }) => api.analytics(from, to, currency, signal),
  });
}
export function useRefreshFinance() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({ queryKey: financeKey, refetchType: "all" });
}
export interface MonthSummary {month:string;income:string;expense:string;net:string;personalExpense:string;householdExpense:string}
export function useMonthlySummary(month:string,currency:string){return useQuery({queryKey:[...financeKey,"monthly-summary",month,currency],queryFn:({signal})=>request<MonthSummary[]>("/summary/monthly?"+new URLSearchParams({month,currency}),{signal})});}
