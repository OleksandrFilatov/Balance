import { t as tr } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { ApiError, request, write } from "./client";
import { financeKey } from "./queries";
import type { Transaction } from "./types";
export type CalendarType =
  | "INCOME"
  | "EXPENSE"
  | "DEBT"
  | "TRANSFER"
  | "LOAN"
  | "REVERSAL"
  | "ADJUSTMENT";
export type EventStatus = "PLANNED" | "COMPLETED" | "OVERDUE" | "CANCELLED";
export interface CalendarEvent {
  id: string;
  date: string;
  scheduledDate: string | null;
  title: string;
  type: CalendarType;
  status: EventStatus;
  source:
    "RECURRING" | "DEBT" | "DEBT_PAYMENT" | "DEBT_REVERSAL" | "TRANSACTION";
  sourceId: string;
  transactionId: string | null;
  paymentId: string | null;
  accountId: string | null;
  amount: string | null;
  currency: string;
  flow: "IN" | "OUT" | "INTERNAL";
  posted: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  version: number | null;
  note: string;
}
export interface CalendarDebtPayment {
  accountId: string;
  principal: string;
  interest: string;
  operationDate: string;
  scope: string;
  description: string;
  nextPayment: string | null;
}
export interface CalendarDay {
  date: string;
  debtDue: string;
  householdDue: string | null;
  totalDue: string | null;
  householdTotal: string;
  householdConfigured: boolean;
  paid: string;
  unknownAmounts: string;
  events: CalendarEvent[];
}
export interface CalendarObligations {
  from: string;
  to: string;
  asOf: string;
  currency: string;
  days: CalendarDay[];
}
export function useCalendarObligations(from: string, to: string, currency: string) {
  return useQuery({
    queryKey: [...financeKey, "calendar-obligations", from, to, currency],
    queryFn: ({ signal }) => request<CalendarObligations>("/calendar/obligations?" + new URLSearchParams({from,to,currency}), {signal}),
  });
}
export const calendarApi = {
  confirmRecurring: (e: CalendarEvent, date: string) =>
    write("/recurring/" + e.sourceId + "/confirm", "POST", {
      occurrenceDate: e.scheduledDate,
      operationDate: date,
      version: e.version,
    }),
  cancelRecurring: (e: CalendarEvent, reason: string) =>
    write("/recurring/" + e.sourceId + "/cancel", "POST", {
      occurrenceDate: e.scheduledDate,
      version: e.version,
      reason,
    }),
  confirmDebt: (e: CalendarEvent, payment: CalendarDebtPayment, key: string) =>
    write(
      "/calendar/debts/" + e.sourceId + "/confirm",
      "POST",
      { occurrenceDate: e.scheduledDate, version: e.version, payment },
      key,
    ),
  cancelPending: (e: CalendarEvent) =>
    write(
      "/transactions/" + e.transactionId + "?version=" + e.version,
      "DELETE",
    ),
  confirmPending: async (e: CalendarEvent, date: string) => {
    const t = await request<Transaction>("/transactions/" + e.transactionId);
    if (t.version !== e.version || t.status !== "PENDING")
      throw new ApiError(409, tr("Операция уже изменилась. Обновите календарь."));
    return write("/transactions/" + t.id, "PUT", {
      version: e.version,
      transaction: {
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        debitAccountId: t.debitAccountId,
        creditAccountId: t.creditAccountId,
        categoryId: t.categoryId,
        scope: t.scope,
        operationDate: date,
        description: t.description,
        status: "CONFIRMED",
      },
    });
  },
};
