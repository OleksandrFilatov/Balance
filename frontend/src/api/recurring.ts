import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
import type { Transaction } from "./types";
export interface RecurringInput {
  name: string;
  description: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  accountId: string;
  categoryId: string;
  scope: "PERSONAL" | "HOUSEHOLD";
  frequency: string;
  firstDate: string;
  endDate?: string|null;
  automatic: boolean;
  householdSplit?: "PROPORTIONAL" | "EQUAL";
  householdGroup?:"FIXED"|"EXTRA";
}
export interface Rule {
  id: string;
  template: RecurringInput;
  currency: string;
  status: string;
  originalFirstDate: string;
  nextDate: string | null;
  version: number;
  lastError: string | null;
  deleted: boolean;
}
export interface Planned {
  templateId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  currency: string;
  accountId: string;
  date: string;
  overdue: boolean;
}
export interface RecurringMonth {month:string;asOf:string;events:Planned[];overdue:Planned[];truncated:boolean}
export function useRecurringMonth(){return useQuery({queryKey:[...financeKey,"recurring-month"],queryFn:({signal})=>request<RecurringMonth>("/recurring/month",{signal})});}
export interface RuleProgress {id:string;month:string;planned:string|null;paid:string;remaining:string|null;percent:string|null;completed:string;occurrences:string;currency:string;complete:boolean;personalShare:boolean}
export function useRecurringProgress(month:string){return useQuery({queryKey:[...financeKey,"recurring-progress",month],queryFn:({signal})=>request<RuleProgress[]>("/recurring/progress?month="+month,{signal})});}
export interface Run {
  cancelled: boolean;
  cancellationReason: string | null;
  id: string;
  occurrenceDate: string;
  mode: string;
  createdAt: string;
  transaction: Transaction;
}
export const recurringApi = {
  remove: (r:Rule)=>write<void>("/recurring/"+r.id+"?version="+r.version,"DELETE"),
  cancelPayment: (id:string,run:string,reason:string)=>write<Run>("/recurring/"+id+"/executions/"+run+"/cancel","POST",{reason}),
  create: (r: RecurringInput) => write<Rule>("/recurring", "POST", r),
  update: (r: Rule, template: RecurringInput, status: string) =>
    write<Rule>("/recurring/" + r.id, "PUT", {
      template,
      status,
      version: r.version,
    }),
  confirm: (r: Rule, operationDate: string) =>
    write<Run>("/recurring/" + r.id + "/confirm", "POST", {
      occurrenceDate: r.nextDate,
      operationDate,
      version: r.version,
    }),
};
export function useRecurring() {
  return useQuery({
    queryKey: [...financeKey, "recurring"],
    queryFn: ({ signal }) => request<Rule[]>("/recurring", { signal }),
  });
}
export function useRecurringHistory(id: string, page: number) {
  return useQuery({
    queryKey: [...financeKey, "recurring-history", id, page],
    queryFn: ({ signal }) =>
      request<{ content: Run[]; totalElements: number }>(
        "/recurring/" + id + "/history?page=" + page,
        { signal },
      ),
  });
}
