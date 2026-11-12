import type { Debt } from "@/api/debts";

/** Keep the actual next unpaid date authoritative; merely passing a date never pays a debt. */
export function compareDebtPaymentDates(a: Debt, b: Debt) {
  const first = a.terms.nextPayment, second = b.terms.nextPayment;
  if (first && !second) return -1;
  if (!first && second) return 1;
  return (first && second ? first.localeCompare(second) : 0)
    || a.terms.name.localeCompare(b.terms.name, "ru")
    || a.id.localeCompare(b.id);
}
