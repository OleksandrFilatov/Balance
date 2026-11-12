import { useQuery } from "@tanstack/react-query";
import { request, write } from "./client";
import { financeKey } from "./queries";
export interface Terms {
  name: string;
  creditor: string;
  description: string;
  kind: string;
  annualRate: string | null;
  monthlyPayment: string | null;
  nextPayment: string | null;
}
export interface DebtPlan {debtId:string;debtVersion:string;canEditSchedule:boolean;nextPayment:string|null;nextAmount:string|null;openedOn:string;firstDate:string|null;endDate:string|null;monthlyAmount:string|null;months:string;completedMonths:string;offset:number;segments:{number:number;date:string;amount:string;paid:string;remaining:string;percent:string;status:"PAID"|"PARTIAL"|"PLANNED"}[];automatic:boolean;accountId:string|null;version:number;error:string|null}
export function useDebtPlan(id:string,offset?:number){return useQuery({queryKey:[...financeKey,"debt-plan",id,offset],enabled:!!id,queryFn:({signal})=>request<DebtPlan>("/debts/"+id+"/plan"+(offset===undefined?"":"?offset="+offset),{signal})});}
export const configureDebtAuto=(id:string,enabled:boolean,accountId:string|null,version:number)=>write<DebtPlan>("/debts/"+id+"/automation","PUT",{enabled,accountId,version});
export interface Debt {
  id: string;
  terms: Terms;
  originalAmount: string;
  openingRemaining: string;
  currency: string;
  origin: string;
  status: string;
  remaining: string;
  repaid: string;
  recordedPrincipal: string;
  progress: string;
  version: number;
  createdAt: string;
}
export interface DebtCreate {
  terms: Terms;
  originalAmount: string;
  openingRemaining: string;
  currency: string;
  origin: string;
  accountId: string | null;
  operationDate: string | null;
}
export interface Payment {
  reversed: boolean;
  reversalDate: string | null;
  reversalReason: string | null;
  id: string;
  accountId: string;
  principal: string;
  interest: string;
  total: string;
  operationDate: string;
  description: string;
  principalTransactionId: string | null;
  interestTransactionId: string | null;
}
export interface DebtOverview {
  currency: string;
  remaining: string;
  activeDebts: string;
  monthlyPayments: string;
  assets: string;
  netWorth: string;
  expenses: string;
  externalOutflow: string;
  upcoming: Debt[];
}
export interface DebtPaymentInput {accountId:string;principal:string;interest:string;operationDate:string;description:string;scope:string;nextPayment:string|null}
export const debtApi = {
  remove:(id:string)=>write<void>("/debts/"+id,"DELETE"),
  reverse: (
    debtId: string,
    paymentId: string,
    operationDate: string,
    reason: string,
    key: string,
  ) =>
    write<Payment>(
      "/debts/" + debtId + "/payments/" + paymentId + "/reverse",
      "POST",
      { operationDate, reason },
      key,
    ),
  create: (body: DebtCreate, key: string) =>
    write<Debt>("/debts", "POST", body, key),
  update: (debt: Debt, terms: Terms, status: string) =>
    write<Debt>("/debts/" + debt.id, "PUT", {
      terms,
      status,
      version: debt.version,
    }),
  pay: (
    debt: Debt,
    body: {
      accountId: string;
      principal: string;
      interest: string;
      operationDate: string;
      description: string;
      scope: string;
      nextPayment: string | null;
    },
    key: string,
  ) => write<Payment>("/debts/" + debt.id + "/payments", "POST", body, key),
  payScheduled: (debt:Debt,payment:DebtPaymentInput,key:string):Promise<Payment>=>write<Payment>("/calendar/debts/"+debt.id+"/confirm","POST",{occurrenceDate:debt.terms.nextPayment,version:debt.version,payment},key),
};
export function useDebts() {
  return useQuery({
    queryKey: [...financeKey, "debts"],
    queryFn: ({ signal }) => request<Debt[]>("/debts", { signal }),
  });
}
export function useDebt(id: string) {
  return useQuery({
    queryKey: [...financeKey, "debt", id],
    queryFn: ({ signal }) => request<Debt>("/debts/" + id, { signal }),
  });
}
export function useDebtOverview(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return useQuery({
    queryKey: [...financeKey, "debt-overview", from, to],
    queryFn: ({ signal }) =>
      request<DebtOverview>("/debts/overview?" + params, { signal }),
  });
}
export function useDebtHistory(id: string, page: number) {
  return useQuery({
    queryKey: [...financeKey, "debt-history", id, page],
    queryFn: ({ signal }) =>
      request<{ content: Payment[]; totalElements: number }>(
        "/debts/" + id + "/payments?page=" + page,
        { signal },
      ),
  });
}
