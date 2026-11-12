import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Copy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  budgetsApi,
  useBudget,
  useBudgetHistory,
  type Budget,
  type BudgetPlan,
  type BudgetReport,
  type BudgetScope,
} from "@/api/budgets";
import { useCategories, useRefreshFinance } from "@/api/queries";
import { formatMoney, normalizeMoney, chartNumber } from "@/lib/money";
import { today } from "@/lib/dates";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorNotice, Loading } from "@/components/feedback";
import { useFinanceUi } from "@/providers/finance-ui";
import { ApiError } from "@/api/client";
import {ProgressBar} from "@/components/ui/progress";
import "@/styles/budgets.css";

const scopeNames = (): Record<BudgetScope, string> => ({
  PERSONAL: tr("Личный"),
  HOUSEHOLD: tr("Домашний"),
});
const percent = (value: string | null) =>
  value === null ? "—" : value.replace(".", ",") + "%";
function Progress({ value }: { value: string | null }) {
  return <ProgressBar value={value} label={tr("Использовано: ")+percent(value)} tone={Number(value)>100?"warning":"accent"}/>;
}
export function BudgetsPage() {
  const [params, setParams] = useSearchParams();
  const month = params.get("month") || today().slice(0, 7),
    scope: BudgetScope =
      params.get("scope") === "HOUSEHOLD" ? "HOUSEHOLD" : "PERSONAL";
  const [category, setCategory] = useState(""),
    [editing, setEditing] = useState<{
      month: string;
      scope: BudgetScope;
      budget: Budget | null;
    } | null>(null),
    [copying, setCopying] = useState(false);
  const query = useBudget(month, scope, category),
    history = useBudgetHistory(scope),
    categories = useCategories();
  const setSelection = (m: string, s: BudgetScope) => {
    setParams({ month: m, scope: s });
    setCategory("");
    setEditing(null);
    setCopying(false);
  };
  const report = query.data;
  return (
    <>
      <PageHeading
        title={tr("Бюджеты")}
        description={tr("Планируйте месяц. Контролируйте реальные расходы.")}
        action={
          report && !query.isFetching
            ? report.budget
              ? tr("Редактировать бюджет")
              : tr("Создать бюджет")
            : undefined
        }
        onAction={() => {
          if (report) setEditing({ month, scope, budget: report.budget });
        }}
      />
      <div className="overview-toolbar budget-toolbar">
        <Field label={tr("Месяц бюджета")}>
          <Input
            type="month"
            min="0001-01"
            max="9999-12"
            value={month}
            onChange={(e) => {
              if (e.target.value) setSelection(e.target.value, scope);
            }}
          />
        </Field>
        <Field label={tr("Область бюджета")}>
          <Select
            value={scope}
            onChange={(e) => setSelection(month, e.target.value as BudgetScope)}
          >
            <option value="PERSONAL">{tr("Личный")}</option>
            <option value="HOUSEHOLD">{tr("Домашний")}</option>
          </Select>
        </Field>
        <Field label={tr("Бюджеты прошлых месяцев")}>
          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) setSelection(e.target.value, scope);
            }}
          >
            <option value="">{tr("Выберите месяц")}</option>
            {history.data?.map((b) => (
              <option key={b.id} value={b.month}>
                {b.month}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          variant="secondary"
          disabled={!!report?.budget || !report || query.isFetching}
          onClick={() => setCopying(true)}
        >
          <Copy size={16} />{" "}{tr("Копировать бюджет")}{" "}</Button>
      </div>
      <ErrorNotice error={history.error} />
      {query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : !report ? (
        <Loading />
      ) : (
        <>
          {!report.budget && (
            <Card>
              <EmptyState
                title={tr("Бюджет на этот месяц ещё не задан")}
                description={tr("Добавьте план или скопируйте прошлый месяц. Фактические операции уже учитываются ниже.")}
              />
            </Card>
          )}
          {report.budget && (
            <p className="page-note">{" "}{tr("Лимиты категорий распределяют общий план и не прибавляются к нему. Не распределено:")}{" "}{formatMoney(report.unallocatedPlan!)}.
            </p>
          )}
          <div className="budget-stats" data-testid="budget-totals">
            <Metric
              title={tr("План доходов")}
              value={report.budget?.plan.plannedIncome ?? null}
            />
            <Metric title={tr("Фактические доходы")} value={report.actualIncome} />
            <Metric
              title={tr("План расходов")}
              value={report.budget?.plan.plannedExpense ?? null}
            />
            <Metric
              title={tr("Фактические расходы")}
              value={report.actualExpense}
              testId="budget-actual-expense"
            />
            <Metric
              title={tr("Остаток бюджета")}
              value={report.remaining}
              testId="budget-remaining"
            />
          </div>
          {report.budget && (
            <Card className="goal-detail">
              <div className="panel-heading">
                <div>
                  <h2>{tr("Использование общего лимита")}</h2>
                  <p className="form-note">
                    {percent(report.usagePercent)}{" "}{tr("· Отклонение расходов (факт − план):")}{" "}{formatMoney(report.expenseDeviation!)}{" "}{tr("· Отклонение доходов:")}{" "}{formatMoney(report.incomeDeviation!)}
                  </p>
                </div>
              </div>
              <Progress value={report.usagePercent} />
              {report.usagePercent === null && (
                <p className="form-note">{" "}{tr("При нулевом плане процент не рассчитывается.")}{" "}</p>
              )}
              {report.exceeded && (
                <p className="budget-warning" role="status">
                  <AlertTriangle size={16} />{" "}{tr("Общий план расходов превышен.")}{" "}</p>
              )}
            </Card>
          )}
          <div className="budget-analysis-grid">
            {report.budget && <BudgetChart report={report} />}
            <Card className="goal-detail">
              <h2>{tr("Расходы без лимита категории")}</h2>
              <p className="budget-large">
                {formatMoney(report.expensesWithoutLimit)}
              </p>
              <p className="form-note">{" "}{tr("Входят в общий факт расходов. Отсутствие лимита отличается от установленного лимита 0 EUR.")}{" "}</p>
              <p className="form-note">{" "}{tr("Переводы, резервы накоплений и основной долг не являются расходами бюджета. Проценты и проведённые регулярные расходы учитываются.")}{" "}</p>
            </Card>
          </div>
          <Card className="goal-detail">
            <div className="panel-heading">
              <h2>{tr("По категориям")}</h2>
              <Select
                aria-label={tr("Фильтр категории бюджета")}
                style={{ maxWidth: 240 }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{tr("Все категории")}</option>
                {categories.data
                  ?.filter((c) => c.type === "EXPENSE")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {categoryName(c)}
                      {c.active ? "" : tr(" (архив)")}
                    </option>
                  ))}
              </Select>
            </div>
            <p className="form-note">{" "}{tr("Фильтр меняет список категорий; общие показатели всегда относятся ко всему месяцу и выбранной области.")}{" "}</p>
            {report.categories.some((c) => c.exceeded) && (
              <p className="budget-warning" role="status">
                <AlertTriangle size={16} />{" "}{tr("Лимит превышен:")}{" "}
                {report.categories
                  .filter((c) => c.exceeded)
                  .map((c) => c.name)
                  .join(", ")}
              </p>
            )}
            <div className="budget-category-list">
              {report.categories.map((c) => (
                <div
                  key={c.categoryId}
                  className={
                    "budget-category " + (c.exceeded ? "over-budget" : "")
                  }
                  data-testid="budget-category"
                >
                  <div className="panel-heading">
                    <h3>
                      {categoryName(c)}
                      {!c.active && <small>{" "}{tr("· Архив")}</small>}
                    </h3>
                    <span className="form-note">
                      {c.planned === null
                        ? tr("Без лимита")
                        : percent(c.usagePercent)}
                    </span>
                  </div>
                  <dl className="budget-category-values">
                    <div>
                      <dt>{tr("План")}</dt>
                      <dd>
                        {c.planned === null
                          ? tr("Без лимита")
                          : formatMoney(c.planned)}
                      </dd>
                    </div>
                    <div>
                      <dt>{tr("Факт")}</dt>
                      <dd>{formatMoney(c.actual)}</dd>
                    </div>
                    <div>
                      <dt>{tr("Остаток")}</dt>
                      <dd>
                        {c.remaining === null ? "—" : formatMoney(c.remaining)}
                      </dd>
                    </div>
                    <div>
                      <dt>{tr("Отклонение")}</dt>
                      <dd>
                        {c.deviation === null ? "—" : formatMoney(c.deviation)}
                      </dd>
                    </div>
                  </dl>
                  {c.planned !== null && <Progress value={c.usagePercent} />}
                  {c.exceeded && (
                    <p className="budget-warning">{tr("Лимит превышен")}</p>
                  )}
                </div>
              ))}
            </div>
            {!report.categories.length && (
              <p className="form-note">{tr("Категорий для выбранного фильтра нет.")}</p>
            )}
            <ErrorNotice error={categories.error} />
          </Card>
        </>
      )}
      {editing && (
        <BudgetEditor
          key={editing.month + editing.scope}
          month={editing.month}
          scope={editing.scope}
          budget={editing.budget}
          close={() => setEditing(null)}
        />
      )}
      {copying && (
        <CopyBudget
          month={month}
          scope={scope}
          close={() => setCopying(false)}
        />
      )}
    </>
  );
}
function Metric({
  title,
  value,
  testId,
}: {
  title: string;
  value: string | null;
  testId?: string;
}) {
  return (
    <Card className="budget-metric">
      <p className="form-note">{title}</p>
      <strong data-testid={testId}>
        {value === null ? tr("Не задан") : formatMoney(value)}
      </strong>
    </Card>
  );
}
function BudgetChart({ report }: { report: BudgetReport }) {
  const rows = [
    {
      name: tr("Доходы"),
      plan: chartNumber(report.budget!.plan.plannedIncome),
      actual: chartNumber(report.actualIncome),
      planExact: report.budget!.plan.plannedIncome,
      actualExact: report.actualIncome,
    },
    {
      name: tr("Расходы"),
      plan: chartNumber(report.budget!.plan.plannedExpense),
      actual: chartNumber(report.actualExpense),
      planExact: report.budget!.plan.plannedExpense,
      actualExact: report.actualExpense,
    },
  ];
  return (
    <Card className="goal-detail">
      <h2>{tr("План и факт")}</h2>
      <p className="form-note">{tr("Оранжевый — план · Зелёный — факт")}</p>
      <div
        style={{ height: 250, minWidth: 0 }}
        role="img"
        aria-label={tr("График плана и факта доходов и расходов")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis width={48} domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as
                  (typeof rows)[number] | undefined;
                return active && row ? (
                  <div className="chart-tooltip">
                    <strong>{categoryName(row)}</strong>
                    <p>{tr("План:")}{" "}{formatMoney(row.planExact)}</p>
                    <p>{tr("Факт:")}{" "}{formatMoney(row.actualExact)}</p>
                  </div>
                ) : null;
              }}
            />
            <Bar
              isAnimationActive={false}
              name={tr("План")}
              dataKey="plan"
              fill="#e9874b"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              isAnimationActive={false}
              name={tr("Факт")}
              dataKey="actual"
              fill="#6d8b80"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
function BudgetEditor({
  month,
  scope,
  budget,
  close,
}: {
  month: string;
  scope: BudgetScope;
  budget: Budget | null;
  close: () => void;
}) {
  const categories = useCategories(),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi(),
    guard = useRef(false);
  const [income, setIncome] = useState(budget?.plan.plannedIncome ?? ""),
    [expense, setExpense] = useState(budget?.plan.plannedExpense ?? ""),
    [limits, setLimits] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        budget?.plan.limits.map((l) => [l.categoryId, l.amount]) ?? [],
      ),
    ),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false);
  const mutation = useMutation({
    mutationFn: (plan: BudgetPlan) =>
      budget
        ? budgetsApi.update(budget, plan)
        : budgetsApi.create(month, scope, plan),
    onSuccess: async () => {
      await refresh();
      notify(tr("Бюджет сохранён"));
      close();
    },
    retry: false,
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (guard.current || uncertain || !categories.data) return;
    guard.current = true;
    setError(null);
    try {
      const nonnegative = (s: string) => {
        const n = normalizeMoney(s, false);
        if (n.startsWith("-"))
          throw new Error(tr("Плановые суммы не могут быть отрицательными."));
        return n;
      };
      const plan = {
        plannedIncome: nonnegative(income),
        plannedExpense: nonnegative(expense),
        limits: Object.entries(limits)
          .filter(([, s]) => s.trim() !== "")
          .map(([categoryId, s]) => ({ categoryId, amount: nonnegative(s) })),
      };
      await mutation.mutateAsync(plan);
    } catch (err) {
      const issue = err instanceof Error ? err : new Error(tr("Ошибка сохранения"));
      if (err instanceof ApiError && err.status === 409) await refresh();
      setError(issue);
      if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) {
        setUncertain(true);
        void refresh();
      }
    } finally {
      guard.current = false;
    }
  };
  return (
    <Dialog
      open
      title={budget ? tr("Редактировать бюджет") : tr("Создать бюджет")}
      description={tr("{0} · {1} · EUR. Пустое поле категории означает отсутствие лимита.", month, scopeNames()[scope])}
      onClose={close}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={(e) => void submit(e)}>
        <fieldset
          disabled={mutation.isPending || uncertain}
          className="budget-fieldset"
        >
          <div className="form-grid">
            <Field label={tr("Плановый доход")}>
              <Input
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                required
              />
            </Field>
            <Field label={tr("Общий план расходов")}>
              <Input
                inputMode="decimal"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                required
              />
            </Field>
          </div>
          <p className="form-note">{" "}{tr("Сумма лимитов категорий не должна превышать общий план расходов. Нераспределённая часть остаётся общим запасом.")}{" "}</p>
          {categories.error ? (
            <ErrorNotice
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          ) : !categories.data ? (
            <Loading />
          ) : (
            <div className="budget-limit-inputs">
              {categories.data
                .filter(
                  (c) =>
                    c.type === "EXPENSE" &&
                    (c.active || limits[c.id] !== undefined),
                )
                .map((c) => (
                  <Field
                    key={c.id}
                    label={tr("Лимит: ") + c.name + (c.active ? "" : tr(" (архив)"))}
                  >
                    <Input
                      inputMode="decimal"
                      placeholder={tr("Без лимита")}
                      value={limits[c.id] ?? ""}
                      onChange={(e) =>
                        setLimits({ ...limits, [c.id]: e.target.value })
                      }
                    />
                  </Field>
                ))}
            </div>
          )}
        </fieldset>
        <ErrorNotice error={error} />
        {uncertain && (
          <p role="alert">{" "}{tr("Ответ сервера не получен. Закройте окно и проверьте сохранённый бюджет перед повторным изменением.")}{" "}</p>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button
            type="submit"
            disabled={mutation.isPending || uncertain || !categories.data}
          >{" "}{tr("Сохранить бюджет")}{" "}</Button>
        </div>
      </form>
    </Dialog>
  );
}
function CopyBudget({
  month,
  scope,
  close,
}: {
  month: string;
  scope: BudgetScope;
  close: () => void;
}) {
  const [y, m] = month.split("-").map(Number),
    previous =
      m === 1
        ? (y - 1).toString().padStart(4, "0") + "-12"
        : y.toString().padStart(4, "0") +
          "-" +
          (m - 1).toString().padStart(2, "0");
  const [source, setSource] = useState(previous),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false),
    guard = useRef(false),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const mutation = useMutation({
    mutationFn: () => budgetsApi.copy(source, month, scope),
    onSuccess: async () => {
      await refresh();
      notify(tr("План скопирован; фактические операции не переносились"));
      close();
    },
    retry: false,
  });
  return (
    <Dialog
      open
      title={tr("Копировать бюджет")}
      description={tr("Новый план: {0} · {1}. Копируются только суммы и лимиты категорий. Существующий бюджет не перезаписывается.", month, scopeNames()[scope])}
      onClose={close}
      busy={mutation.isPending}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (guard.current || uncertain) return;
          guard.current = true;
          setError(null);
          try {
            await mutation.mutateAsync();
          } catch (err) {
            setError(err as Error);
            if (err instanceof ApiError && err.status === 409) void refresh();
            if (
              err instanceof ApiError &&
              (err.status === 0 || err.status >= 500)
            ) {
              setUncertain(true);
              void refresh();
            }
          } finally {
            guard.current = false;
          }
        }}
      >
        <Field label={tr("Месяц-источник")}>
          <Input
            type="month"
            min="0001-01"
            max="9999-12"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={mutation.isPending || uncertain}
            required
          />
        </Field>
        <ErrorNotice error={error} />
        {uncertain && (
          <p role="alert">{" "}{tr("Проверьте результат копирования после закрытия окна.")}{" "}</p>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={mutation.isPending || uncertain}>{" "}{tr("Скопировать план")}{" "}</Button>
        </div>
      </form>
    </Dialog>
  );
}
