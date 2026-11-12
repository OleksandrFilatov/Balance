import { getLocale } from "@/i18n";
const MIN = "0001-01-01",
  MAX = "9999-12-31";
export function berlinToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export const calendarDate = (iso: string) => new Date(iso + "T12:00:00Z");
export function calendarKey(date: Date) {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
export function plusDays(iso: string, amount: number) {
  const d = calendarDate(iso);
  d.setUTCDate(d.getUTCDate() + amount);
  return calendarKey(d);
}
function clamp(iso: string) {
  return iso < MIN ? MIN : iso > MAX || iso.length !== 10 ? MAX : iso;
}
export type CalendarMode = "month" | "week";
export function calendarRange(anchor: string, mode: CalendarMode) {
  if (mode === "week") {
    const offset = (calendarDate(anchor).getUTCDay() + 6) % 7;
    return {
      from: clamp(plusDays(anchor, -offset)),
      to: clamp(plusDays(anchor, 6 - offset)),
    };
  }
  const from = anchor.slice(0, 7) + "-01",
    d = calendarDate(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return { from, to: calendarKey(d) };
}
export function moveCalendar(anchor: string, mode: CalendarMode, step: number) {
  if (mode === "week") return clamp(plusDays(anchor, step * 7));
  const d = calendarDate(anchor.slice(0, 7) + "-01");
  d.setUTCMonth(d.getUTCMonth() + step);
  return clamp(calendarKey(d));
}
export function calendarDays(from: string, to: string) {
  const days: string[] = [];
  for (let d = from; d <= to; d = plusDays(d, 1)) {
    days.push(d);
    if (d === MAX) break;
  }
  return days;
}
export const calendarLabel = (date: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(calendarDate(date));
