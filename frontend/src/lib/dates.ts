import { getLocale } from "@/i18n";
import {berlinToday} from "./calendar-dates";
export function today(): string { return berlinToday(); }
export function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function monthRange(month: string) {
  const [year, number] = month.split("-").map(Number);
  return { from: month + "-01", to: dateKey(new Date(year, number, 0)) };
}
export function displayDate(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
  }).format(new Date(value + "T12:00:00"));
}
export const monthName = (month: string) =>
  new Intl.DateTimeFormat(getLocale(), { month: "long", year: "numeric" }).format(
    new Date(month + "-01T12:00:00"),
  );
