import type { Goal } from "@/api/savings";
import { t } from "@/i18n";
import { calendarLabel } from "@/lib/calendar-dates";
import { cents, formatMoney } from "@/lib/money";
import { Button } from "./ui/button";

export function GoalDeadlinePlan({goal, onSetDate}: {goal: Goal; onSetDate: () => void}) {
  const forecast = goal.forecast;
  if (goal.status !== "ACTIVE") return null;
  if (cents(forecast.remaining) === 0n)
    return <p className="goal-deadline-plan" data-testid="goal-deadline-plan">{t("Цель достигнута")}</p>;
  if (!goal.deadline || forecast.requiredMonthly === null)
    return <div className="goal-deadline-plan" data-testid="goal-deadline-plan">
      <span>{t("Укажите дату цели — рассчитаем, сколько откладывать в месяц.")}</span>
      <Button variant="ghost" size="small" onClick={onSetDate}>{t("Указать дату цели")}</Button>
    </div>;
  return <div className="goal-deadline-plan" data-testid="goal-deadline-plan">
    <span>{forecast.overdue ? t("Срок цели прошёл — осталось внести") : t("Откладывать до {0}", calendarLabel(goal.deadline))}</span>
    <strong data-testid="goal-required-monthly">{formatMoney(forecast.requiredMonthly, goal.currency)}
      {!forecast.overdue && <small>{t("/ месяц")}</small>}
    </strong>
    <small>{forecast.overdue ? t("Измените срок, чтобы пересчитать ежемесячный взнос.")
      : t("С учётом накопленного · взносов: {0}", forecast.monthsUntilDeadline ?? "—")}</small>
    {!forecast.overdue && <small>{t("Первый взнос — сейчас, следующие — раз в месяц. Расчёт не списывает деньги.")}</small>}
  </div>;
}
