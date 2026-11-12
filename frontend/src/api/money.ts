import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey, useAccounts } from "./queries";
import { useState } from "react";
import type { Account } from "./types";
export interface MoneyPeriod {
  month:string;mode:"CURRENT"|"HISTORY"|"FORECAST";complete:boolean;overview:MoneyOverview;
  opening:string|null;paidMandatory:string;warnings:string[];
  steps:{month:string;opening:string|null;income:string;payments:string;closing:string|null;unknownObligations:string}[];
}
export function useMoneyPeriod(currency:string,month:string){
  return useQuery({queryKey:[...financeKey,"money-period",currency,month],queryFn:({signal})=>request<MoneyPeriod>("/money/period?"+new URLSearchParams({currency,month}),{signal})});
}
export interface MoneyOverview {
  breakdown: {
    debts: PaymentPart;
    household: PaymentPart;
    personal: PaymentPart;
    total: string;
    complete: boolean;
  };
  currency: string;
  asOf: string;
  until: string;
  balance: string;
  income: string;
  expense: string;
  mandatory: string;
  afterMandatory: string | null;
  unknownObligations: string;
  defaultAccountId: string | null;
  deductions:{type:"DEBT"|"HOUSEHOLD"|"PERSONAL";name:string;date:string;amount:string|null;href:string}[];
}
export interface PaymentPart { amount: string; complete: boolean }
export interface HomeSection {
  key: string;
  name: string;
  categoryId: string | null;
  spent: string;
}
export const moneyApi = {
  ensure: (accountId: string | null = null) =>
    write<Account>("/money/default-account", "POST", { accountId }),

};
export function useMoney(currency = "EUR") {
  return useQuery({
    queryKey: [...financeKey, "money", currency],
    queryFn: ({ signal }) =>
      request<MoneyOverview>("/money?currency=" + currency, { signal }),
  });
}
export function useHousehold(month: string) {
  return useQuery({
    queryKey: [...financeKey, "household", month],
    queryFn: ({ signal }) =>
      request<{ month: string; spent: string; sections: HomeSection[] }>(
        "/money/household?month=" + month,
        { signal },
      ),
  });
}
export function useDisplayCurrency() {
  const accounts = useAccounts(),
    [chosen, setCurrency] = useState<string | null>(null);
  const currencies = Array.from(
    new Set(accounts.data?.map((a) => a.currency) ?? ["EUR"]),
  ).sort();
  if (!currencies.length) currencies.push("EUR");
  return {
    currency:
      chosen && currencies.includes(chosen)
        ? chosen
        : currencies.includes("EUR")
          ? "EUR"
          : currencies[0],
    currencies,
    setCurrency,
  };
}
