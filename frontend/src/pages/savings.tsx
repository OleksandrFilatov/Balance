import { GoalDeadlinePlan } from "@/components/goal-deadline-plan";
import { categoryName } from "@/i18n/category-names";
import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  PiggyBank,
  Plus,
  Pencil,
  ArrowRightLeft,
  Calculator,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  useGoals,
  useSavings,
  useGoal,
  useAllocations,
  useGoalHistory,
  savingsApi,
  type Goal,
  type GoalInput,
} from "@/api/savings";
import { ApiError } from "@/api/client";
import { berlinToday } from "@/lib/calendar-dates";
import { useAccounts, useRefreshFinance } from "@/api/queries";
import { formatMoney, normalizeMoney, cents } from "@/lib/money";
import { useFinanceUi } from "@/providers/finance-ui";
import { PageHeading } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Field, Select, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorNotice, Loading } from "@/components/feedback";
import {ProgressBar} from "@/components/ui/progress";
import {CollectionSearch,CollectionPages} from "@/components/collection-tools";
import {GoalCalculator} from "@/components/goal-calculator";

export function SavingsPanel({ compact = false }: { compact?: boolean }) {
  const savings = useSavings(),
    goals = useGoals();
  if (savings.error || goals.error)
    return (
      <ErrorNotice
        error={savings.error ?? goals.error}
        retry={() => {
          void savings.refetch();
          void goals.refetch();
        }}
      />
    );
  if (!savings.data || !goals.data)
    return <Loading label={tr("Загружаем накопления")} />;
  const s = savings.data;
  const nearest = goals.data
    .filter((g) => g.status === "ACTIVE")
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
    .slice(0, 3);
  return (
    <section className="savings-summary">
      <div className="savings-metrics">
        <Card>
          <span>{tr("Зарезервировано · EUR")}</span>
          <strong data-testid="savings-total">{formatMoney(s.reserved)}</strong>
        </Card>
        <Card>
          <span>{tr("Свободные средства · EUR")}</span>
          <strong data-testid="savings-free">{formatMoney(s.free)}</strong>
        </Card>
        <Card>
          <span>{tr("Активные цели")}</span>
          <strong>{s.activeGoals}</strong>
        </Card>
      </div>
      {s.accounts
        .filter((a) => a.underfunded)
        .map((a) => (
          <div role="alert" className="savings-warning" key={a.accountId}>
            <AlertTriangle size={20} />
            <div>
              <strong>{tr("Недостаточно обеспечения:")}{" "}{categoryName(a)}</strong>
              <p>{" "}{tr("На счёте")}{" "}{formatMoney(a.balance)}{tr(", зарезервировано")}{" "}
                {formatMoney(a.reserved)}{tr(". Свободно")}{" "}{formatMoney(a.free)}{tr(". Освободите часть резервов или пополните счёт реальным переводом.")}{" "}</p>
            </div>
          </div>
        ))}
      {compact && (
        <Card className="savings-nearest">
          <div className="panel-heading">
            <h2>{tr("Ближайшие цели")}</h2>
            <Link to="/savings" className="text-link">{" "}{tr("Все накопления →")}{" "}</Link>
          </div>
          {nearest.length ? (
            nearest.map((g) => (
              <Link to={"/savings/" + g.id} key={g.id} className="nearest-goal">
                <div>
                  <strong>{categoryName(g)}</strong>
                  <span>
                    {formatMoney(g.reserved)} / {formatMoney(g.target)} ·{" "}
                    {g.forecast.percent}%
                  </span>
                </div>
                <Progress goal={g} />
              </Link>
            ))
          ) : (
            <p className="page-note">{" "}{tr("Создайте первую цель в разделе «Накопления».")}{" "}</p>
          )}
        </Card>
      )}
    </section>
  );
}
function Progress({ goal }: { goal: Goal }) {
  return <ProgressBar value={goal.forecast.percent} label={tr("Прогресс накоплений")} tone={Number(goal.forecast.percent)>=100?"success":"accent"} caption/>;
}
type EditorState = {
  goal?: Goal;
  mode: "edit" | "allocate" | "reallocate" | "delete";
};
export function SavingsPage() {
  const goals = useGoals();
  const [editor, setEditor] = useState<EditorState | null>(null),
    [archived, setArchived] = useState(false),[search,setSearch]=useState(""),[page,setPage]=useState(0),[calculator,setCalculator]=useState(false);
  const rows=(goals.data??[]).filter(g=>(archived||g.status!=="ARCHIVED")&&g.name.toLocaleLowerCase("ru").includes(search.trim().toLocaleLowerCase("ru"))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const pages=Math.ceil(rows.length/12),safePage=Math.min(page,Math.max(0,pages-1));
  return (
    <>
      <PageHeading
        title={tr("Накопления")}
        description={tr("Деньги для того, что действительно важно.")}
        action={tr("Новая цель")}
        onAction={() => setEditor({ mode: "edit" })}
      />
      <SavingsSimpleTotal />
      <div className="overview-toolbar">
        <h2>{tr("Финансовые цели")}</h2><Button variant="secondary" size="small" onClick={()=>setCalculator(true)}><Calculator size={16}/>{tr("Рассчитать план")}</Button>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => {setArchived(e.target.checked);setPage(0);}}
          />{" "}{tr("Показать архив")}{" "}</label>
      </div>
      {(goals.data?.length??0)>6&&<CollectionSearch value={search} onChange={s=>{setSearch(s);setPage(0);}} label={tr("Найти цель")} count={rows.length}/>}
      {goals.error ? (
        <ErrorNotice error={goals.error} retry={() => void goals.refetch()} />
      ) : !goals.data ? (
        <Loading />
      ) : rows.length ? (
        <div className="goals-grid finance-collection">
          {rows.slice(safePage*12,(safePage+1)*12)
            .map((g) => (
              <Card key={g.id} className="goal-card">
                <div className="panel-heading">
                  <PiggyBank size={18} />
                  <span className="soft-badge">{statusName(g.status)}</span>
                </div>
                <Link to={"/savings/" + g.id}>
                  <h2>{categoryName(g)}</h2>
                </Link>
                {g.description&&<p className="goal-description">{g.description}</p>}
                <div className="goal-amount">
                  <strong>{formatMoney(g.reserved)}</strong>
                  <span>{tr("из")}{" "}{formatMoney(g.target)}</span>
                </div>
                <Progress goal={g} />
                <GoalDeadlinePlan goal={g} onSetDate={() => setEditor({goal:g,mode:"edit"})}/>
                <div className="goal-caption">
                  <span>{g.deadline ? tr("До ")+g.deadline : tr("Без срока")}</span>
                </div>
                <p className="form-note">{" "}{tr("Осталось накопить")}{" "}{formatMoney(g.forecast.remaining)}
                </p>
                <div className="goal-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setEditor({ goal: g, mode: "allocate" })}
                    disabled={g.status !== "ACTIVE"}
                  >
                    <Plus size={15} />{" "}{tr("Выделить")}{" "}</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tr("Редактировать: ") + g.name}
                    onClick={() => setEditor({ goal: g, mode: "edit" })}
                  >
                    <Pencil size={17} />
                  </Button>
                  <DeleteGoal goal={g} />
                </div>
                <Link to={"/savings/" + g.id} className="text-link">{" "}{tr("История и прогноз →")}{" "}</Link>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title={search?tr("Цель не найдена"):tr("Ваша первая цель")}
            description={tr("Выделите часть существующих денег на важную покупку или финансовую подушку.")}
            action={tr("Создать цель")}
            onAction={() => setEditor({ mode: "edit" })}
          />
        </Card>
      )}
      <CollectionPages page={safePage} total={pages} onChange={setPage}/>
      {calculator&&<GoalCalculator onClose={()=>setCalculator(false)}/>}
      {editor && <GoalEditor {...editor} onClose={() => setEditor(null)} />}
    </>
  );
}
function SavingsSimpleTotal() {
  const q = useSavings();
  return q.error ? (
    <ErrorNotice error={q.error} retry={() => void q.refetch()} />
  ) : !q.data ? (
    <Loading />
  ) : (
    <>
      <Card className="daily-total debt-simple-total">
        <span>{tr("Отложено на цели · EUR")}</span>
        <strong data-testid="savings-total">
          {formatMoney(q.data.reserved)}
        </strong>
        <p className="form-note">
          {q.data.activeGoals}{" "}{tr("активных целей. Деньги остаются вашими.")}{" "}</p>
      </Card>
      {q.data.accounts
        .filter((a) => a.underfunded)
        .map((a) => (
          <p key={a.accountId} role="alert" className="savings-warning">{" "}{tr("На")}{" "}{categoryName(a)}{" "}{tr("не хватает денег для выделенных резервов:")}{" "}
            {formatMoney(a.balance)}{" "}{tr("при резерве")}{" "}{formatMoney(a.reserved)}.
          </p>
        ))}
    </>
  );
}

function DeleteGoal({goal}:{goal:Goal}) {
 const [open,setOpen]=useState(false),refresh=useRefreshFinance(),navigate=useNavigate();
 const mutation=useMutation({mutationFn:async()=>{await savingsApi.remove(goal);await refresh();setOpen(false);navigate("/savings");},retry:false});
 return <><Button variant="ghost" size="icon" className="delete-action goal-delete-quiet" title={tr("Удалить цель")} onClick={()=>setOpen(true)} aria-label={tr("Удалить цель: ")+goal.name}><Trash2 size={15}/></Button>
 {open&&<Dialog open title={tr("Удалить финансовую цель?")} description={tr("Зарезервированные деньги снова станут доступными. Баланс счёта не изменится.")} onClose={()=>setOpen(false)} busy={mutation.isPending}>
 <ErrorNotice error={mutation.error}/><Button variant="destructive" disabled={mutation.isPending} onClick={()=>mutation.mutate()}>{tr("Удалить цель")}</Button></Dialog>}</>;
}
const statusName = (status: string) =>
  ({ ACTIVE: tr("Активна"), ARCHIVED: tr("В архиве"), ACHIEVED: tr("Достигнута") })[
    status
  ] ?? status;
export function GoalDetailsPage() {
  const { id = "" } = useParams(),
    goal = useGoal(id),
    allocations = useAllocations(id),
    accounts = useAccounts();
  const [page, setPage] = useState(0),
    history = useGoalHistory(id, page),
    [editor, setEditor] = useState<EditorState | null>(null);
  const error = goal.error ?? allocations.error ?? accounts.error;
  if (error)
    return (
      <ErrorNotice
        error={error}
        retry={() => {
          void goal.refetch();
          void allocations.refetch();
          void accounts.refetch();
        }}
      />
    );
  if (!goal.data || !allocations.data || !accounts.data) return <Loading />;
  const g = goal.data,
    f = g.forecast;
  return (
    <>
      <Link to="/savings" className="text-link">{" "}{tr("← Все цели")}{" "}</Link>
      <PageHeading
        title={g.name}
        description={g.description || tr("Ваша финансовая цель")}
        action={tr("Выделить средства")}
        onAction={() => setEditor({ goal: g, mode: "allocate" })}
      />
      <SavingsPanel />
      <Card className="goal-detail">
        <div className="panel-heading">
          <h2>{statusName(g.status)}</h2>
          <strong>{f.percent}%</strong>
        </div>
        <div className="goal-amount">
          <strong>{formatMoney(g.reserved)}</strong>
          <span>{tr("из")}{" "}{formatMoney(g.target)}</span>
        </div>
        <Progress goal={g} />
                <GoalDeadlinePlan goal={g} onSetDate={() => setEditor({goal:g,mode:"edit"})}/>
        <div className="goal-actions">
          <Button
            variant="secondary"
            onClick={() => setEditor({ goal: g, mode: "reallocate" })}
          >
            <ArrowRightLeft size={16} />{" "}{tr("Перераспределить")}{" "}</Button>
          <Button
            variant="secondary"
            onClick={() => setEditor({ goal: g, mode: "edit" })}
          >
            <Pencil size={16} />{" "}{tr("Изменить / статус")}{" "}</Button>
          <Button
            variant="ghost"
            size="icon"
            className="delete-action goal-delete-quiet"
            title={tr("Удалить цель")}
            aria-label={tr("Удалить цель: ")+g.name}
            onClick={() => setEditor({ goal: g, mode: "delete" })}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </Card>
      <details className="daily-details">
        <summary>{tr("Прогноз и размещение средств")}</summary>
        <div className="goals-grid forecast-grid">
          <Card className="goal-detail">
            <h2>{tr("Прогноз накоплений")}</h2>
            <dl className="forecast-list">
              {[
                [tr("Осталось до цели"), formatMoney(f.remaining)],
                [tr("Плановая дата"), g.deadline ?? tr("Не задана")],
                [
                  tr("Нужно в месяц к сроку"),
                  f.requiredMonthly === null
                    ? tr("Укажите дату")
                    : formatMoney(f.requiredMonthly),
                ],
                [tr("Ежемесячный план"), formatMoney(g.monthlyPlan)],
                [tr("Осталось взносов"), f.monthsNeeded ?? tr("Укажите взнос")],
                [tr("Ожидаемая дата"), f.estimatedDate ?? tr("Нет прогноза")],
                [tr("План к текущему месяцу"), formatMoney(f.plannedToDate)],
                [tr("Фактически выделено"), formatMoney(f.actual)],
                [tr("Отклонение от плана"), formatMoney(f.variance)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {f.overdue && (
              <p className="validation-error">{" "}{tr("Срок прошёл. Остаток нужно внести сейчас или пересмотреть дату.")}{" "}</p>
            )}
            <p className="form-note">{" "}{tr("План предполагает первый взнос сегодня, затем ежемесячно. Сравнение использует текущий план с месяца создания цели; это прогноз, а не обещание доходности.")}{" "}</p>
          </Card>
          <Card className="goal-detail">
            <h2>{tr("Резервы по счетам")}</h2>
            {Object.entries(allocations.data).length ? (
              Object.entries(allocations.data).map(([account, amount]) => (
                <div className="allocation-row" key={account}>
                  <span>
                    {accounts.data!.find((a) => a.id === account)?.name ??
                      tr("Счёт")}
                  </span>
                  <strong>{formatMoney(amount)}</strong>
                </div>
              ))
            ) : (
              <p className="page-note">{tr("Средства пока не выделены.")}</p>
            )}
            <p className="form-note">{" "}{tr("Деньги остаются на этих счетах. Резервирование не является расходом или банковским переводом.")}{" "}</p>
          </Card>
        </div>
      </details>
      <Card className="goal-detail">
        <h2>{tr("История изменений")}</h2>
        {history.error ? (
          <ErrorNotice error={history.error} />
        ) : !history.data ? (
          <Loading />
        ) : (
          <>
            <div className="savings-history">
              {history.data.content.map((e) => (
                <div key={e.id}>
                  <div>
                    <strong>
                      {
                        (
                          {
                            CREATED: tr("Цель создана"),
                            UPDATED: tr("Цель изменена"),
                            ALLOCATED: tr("Выделение"),
                            RELEASED: tr("Освобождение"),
                            REALLOCATED_IN: tr("Перераспределение в цель"),
                            REALLOCATED_OUT: tr("Перераспределение из цели"),
                            DELETED: tr("Удаление"),
                            DELETION_RELEASE: tr("Освобождение при удалении"),
                          } as Record<string, string>
                        )[e.action]
                      }
                    </strong>
                    <p>{e.note}</p>
                    <small>
                      {new Date(e.createdAt).toLocaleString(getLocale())}
                      {e.accountId
                        ? " · " +
                          (accounts.data!.find((a) => a.id === e.accountId)
                            ?.name ?? tr("Счёт"))
                        : ""}
                    </small>
                  </div>
                  {e.accountId && <span>{formatMoney(e.amount)}</span>}
                </div>
              ))}
            </div>
            <div className="pagination">
              <Button
                variant="secondary"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >{" "}{tr("Назад")}{" "}</Button>
              <span>{tr("Страница")}{" "}{page + 1}</span>
              <Button
                variant="secondary"
                disabled={(page + 1) * 50 >= history.data.totalElements}
                onClick={() => setPage(page + 1)}
              >{" "}{tr("Далее")}{" "}</Button>
            </div>
          </>
        )}
      </Card>
      {editor && <GoalEditor {...editor} onClose={() => setEditor(null)} />}
    </>
  );
}
function GoalEditor({
  goal,
  mode,
  onClose,
}: EditorState & { onClose: () => void }) {
  const accounts = useAccounts(),
    goals = useGoals(),
    overview = useSavings(),
    allocation = useAllocations(goal?.id ?? "new");
  const refresh = useRefreshFinance(),
    { notify } = useFinanceUi(),
    navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const guard = useRef(false),
    key = useRef(crypto.randomUUID()),
    snapshot = useRef<FormData | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (mode === "delete") return savingsApi.remove(goal!);
      if (mode === "edit") {
        const body: GoalInput = {
          name: String(data.get("name")).trim(),
          description: String(data.get("description")??"").trim(),
          target: normalizeMoney(String(data.get("target"))),
          currency: "EUR",
          deadline: String(data.get("deadline")) || null,
          monthlyPlan: normalizeMoney(String(data.get("monthlyPlan")), false),
        };
        if (
          body.deadline &&
          body.deadline < berlinToday() &&
          body.deadline !== goal?.deadline
        )
          throw new Error(tr("Выберите сегодняшнюю или будущую дату достижения."));
        if (cents(body.monthlyPlan) < 0n)
          throw new Error(tr("Ежемесячный план не может быть отрицательным"));
        return goal
          ? savingsApi.update(goal, body, String(data.get("status")))
          : savingsApi.create(body);
      }
      return savingsApi.fund(
        goal!,
        mode,
        String(data.get("accountId")),
        normalizeMoney(String(data.get("amount"))),
        String(data.get("note")),
        key.current,
        String(data.get("toGoalId") ?? ""),
      );
    },
    retry: false,
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guard.current) return;
    const data =
      uncertain && snapshot.current
        ? snapshot.current
        : new FormData(e.currentTarget);
    snapshot.current = data;
    guard.current = true;
    setBusy(true);
    setError(null);
    try {
      await mutation.mutateAsync(data);
      await refresh();
      notify(tr("Накопления обновлены"));
      onClose();
      if (mode === "delete") navigate("/savings");
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        void refresh();
      }
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const title =
    mode === "edit"
      ? goal
        ? tr("Редактировать цель")
        : tr("Новая цель")
      : mode === "delete"
        ? tr("Удалить цель?")
        : mode === "allocate"
          ? tr("Выделить средства")
          : tr("Перераспределить средства");
  return (
    <Dialog
      open
      title={title}
      description={
        mode === "delete"
          ? tr("Все резервы цели будут освобождены. История сохранится; реальные финансовые записи не удаляются.")
          : tr("Резервы не меняют реальный баланс банковских счетов.")
      }
      onClose={onClose}
      busy={busy}
    >
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="form-stack" disabled={busy || uncertain}>
          {mode === "edit" ? (
            <>
              <Field label={tr("Название цели")}>
                <Input
                  name="name"
                  defaultValue={goal?.name}
                  required
                  maxLength={100}
                />
              </Field>
              <Field label={tr("Целевая сумма, EUR")}>
                <Input
                  name="target"
                  inputMode="decimal"
                  defaultValue={goal?.target}
                  required
                />
              </Field>
              <div className="form-grid">
                <Field label={tr("Дата достижения")}>
                  <Input
                    type="date"
                    name="deadline"
                    min={
                      goal?.deadline && goal.deadline < berlinToday()
                        ? goal.deadline
                        : berlinToday()
                    }
                    max="9999-12-31"
                    defaultValue={goal?.deadline ?? ""}
                  />
                </Field>
                <Field label={tr("План в месяц, EUR")}>
                  <Input
                    name="monthlyPlan"
                    inputMode="decimal"
                    defaultValue={goal?.monthlyPlan ?? "0.00"}
                    required
                  />
                </Field>
              </div>
              <Field label={tr("Описание (необязательно)")}><Textarea name="description" rows={2} maxLength={2000} defaultValue={goal?.description??""}/></Field>
              {goal && (
                <Field label={tr("Статус цели")}>
                  <Select name="status" defaultValue={goal.status}>
                    <option value="ACTIVE">{tr("Активна")}</option>
                    <option value="ACHIEVED">{tr("Достигнута")}</option>
                    <option value="ARCHIVED">{tr("В архиве")}</option>
                  </Select>
                </Field>
              )}
            </>
          ) : mode === "delete" ? (
            <p>{" "}{tr("Удалить «")}{goal?.name}{tr("» и освободить")}{" "}{formatMoney(goal!.reserved)}?
            </p>
          ) : (
            <>
              <Field label={tr("Счёт резервирования")}>
                <Select name="accountId" required>
                  <option value="">{tr("Выберите счёт")}</option>
                  {accounts.data
                    ?.filter(
                      (a) =>
                        a.currency === "EUR" &&
                        (mode === "allocate"
                          ? a.active
                          : !!allocation.data?.[a.id]),
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {categoryName(a)} ·{" "}
                        {mode === "allocate"
                          ? tr("свободно ") +
                            formatMoney(
                              overview.data?.accounts.find(
                                (b) => b.accountId === a.id,
                              )?.free ?? "0",
                            )
                          : tr("в цели ") +
                            formatMoney(allocation.data?.[a.id] ?? "0")}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={tr("Сумма, EUR")}>
                <Input name="amount" inputMode="decimal" required />
              </Field>
              {mode === "reallocate" && (
                <Field label={tr("В другую цель")}>
                  <Select name="toGoalId" required>
                    <option value="">{tr("Выберите цель")}</option>
                    {goals.data
                      ?.filter(
                        (g) => g.status === "ACTIVE" && g.id !== goal?.id,
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {categoryName(g)}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
              <Field label={tr("Комментарий")}>
                <Textarea name="note" maxLength={2000} />
              </Field>
            </>
          )}
        </fieldset>
        <ErrorNotice error={error ?? accounts.error ?? goals.error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Ответ мог потеряться после сохранения. Для выделения и перераспределения безопасен повтор с прежним ключом. При изменении цели обновите список перед повтором.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button variant="secondary" disabled={busy} onClick={onClose}>{" "}{tr("Отмена")}{" "}</Button>
          <Button
            type="submit"
            variant={mode === "delete" ? "destructive" : "default"}
            disabled={busy || (uncertain && mode === "edit" && !goal)}
          >
            {busy
              ? tr("Сохраняем…")
              : uncertain
                ? tr("Повторить запрос")
                : mode === "delete"
                  ? tr("Удалить цель")
                  : tr("Сохранить")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
