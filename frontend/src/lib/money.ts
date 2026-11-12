import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
export function cents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error(tr("Некорректная денежная сумма"));
  return (
    (match[1] ? -1n : 1n) *
    (BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0")))
  );
}
export function decimal(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return (
    (value < 0n ? "-" : "") +
    absolute / 100n +
    "." +
    (absolute % 100n).toString().padStart(2, "0")
  );
}
export function normalizeMoney(value: string, positive = true): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(normalized))
    throw new Error(tr("Введите сумму с точностью до двух знаков после запятой."));
  const amount = cents(normalized);
  if (positive && amount <= 0n)
    throw new Error(tr("Сумма должна быть больше нуля."));
  return decimal(amount);
}
export function formatMoney(value: string, currency = "EUR"): string {
  const amount = cents(value),
    absolute = amount < 0n ? -amount : amount;
  const integer = new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
  }).format(absolute / 100n);
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  })
    .formatToParts(0)
    .map((part) =>
      part.type === "integer"
        ? (amount < 0n ? "−" : "") + integer
        : part.type === "fraction"
          ? (absolute % 100n).toString().padStart(2, "0")
          : part.value,
    )
    .join("");
}
export function chartNumber(value: string): number {
  return Number(cents(value)) / 100;
}
