import { t as tr } from "@/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";
import { financeKey } from "./queries";
import type { MoneyOverview } from "./money";

export interface AdviceInput { goalId: string | null; living: string | null; useBalanceOnly: boolean }
export interface SavingsAdvice {
  month: string; currency: string; ready: boolean; missing: string[];
  balance: string; income: string; mandatory: string; reserved: string;
  living: string | null; available: string | null; shortage: string | null;
  unknownObligations: string; useBalanceOnly: boolean; underfunded: boolean;
  deductions: MoneyOverview["deductions"];
  goals: { id: string; name: string }[];
  goal: null | {
    id: string; name: string; remaining: string; otherPlans: string; available: string;
    recommended: string; requiredMonthly: string | null; monthsNeeded: string | null;
    estimatedDate: string | null; deadline: string | null; feasible: boolean;
  };
}

// Preview and the dashboard share the exact same read-only calculation/cache.
export function useAdviceCalculation(month: string, input: AdviceInput | null) {
  return useQuery({
    queryKey: [...financeKey, "savings-advice", month, input],
    enabled: input !== null,
    staleTime: 5_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!input) throw new Error(tr("Укажите параметры расчёта."));
      if (input.living === null && input.goalId === null && !input.useBalanceOnly)
        return request<SavingsAdvice>("/savings/advice", { signal });
      const csrf = await request<{ headerName: string; token: string }>("/csrf", { signal });
      return request<SavingsAdvice>("/savings/advice", {
        method: "POST", signal,
        headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token },
        body: JSON.stringify(input),
      });
    },
  });
}

export function useSavingsAdvice(month: string) {
  const client = useQueryClient();
  // Session-only assumptions survive navigation, are cleared on logout, and are never saved to disk.
  const inputKey = ["savings-advice-input", month];
  const config = useQuery<AdviceInput>({
    queryKey: inputKey, enabled: false, gcTime: Infinity,
    initialData: { goalId: null, living: null, useBalanceOnly: false },
  });
  const query = useAdviceCalculation(month, config.data);
  return { ...query, input: config.data, setInput: (value: AdviceInput) => client.setQueryData(inputKey, value) };
}
