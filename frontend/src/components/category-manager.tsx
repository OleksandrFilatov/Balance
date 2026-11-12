import { categoryName } from "@/i18n/category-names";
import { t as tr } from "@/i18n";
import { useRef, useState, type FormEvent } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { Category } from "@/api/types";
import { useCategories, useRefreshFinance } from "@/api/queries";
import { useFinanceUi } from "@/providers/finance-ui";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Field } from "./ui/input";
import { ErrorNotice, Loading } from "./feedback";

type Action = {
  kind: "create" | "rename" | "remove" | "restore";
  category?: Category;
};
export function CategoryManager({
  initialType = "INCOME",
}: {
  initialType?: "INCOME" | "EXPENSE";
}) {
  const query = useCategories();
  const [type, setType] = useState(initialType),
    [search, setSearch] = useState(""),
    [action, setAction] = useState<Action | null>(null);
  const rows =
    query.data?.filter(
      (c) =>
        c.type === type &&
        c.name
          .toLocaleLowerCase("ru")
          .includes(search.trim().toLocaleLowerCase("ru")),
    ) ?? [];
  const row = (c: Category) => {
    const fixed = false;
    return (
      <div className="category-row" key={c.id} data-testid="category-row">
        <div>
          <strong>{categoryName(c)}</strong>
          {fixed && <small>{tr("Постоянная категория")}</small>}
        </div>
        <div className="category-row-actions">
          {c.active ? (
            !fixed && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={tr("Переименовать: ") + c.name}
                  onClick={() => setAction({ kind: "rename", category: c })}
                >
                  <Pencil size={17} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={tr("Удалить категорию: ") + c.name}
                  onClick={() => setAction({ kind: "remove", category: c })}
                >
                  <Trash2 size={17} />
                </Button>
              </>
            )
          ) : (<>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setAction({ kind: "restore", category: c })}
            >
              <RotateCcw size={16} />{" "}{tr("Вернуть")}{" "}</Button>
            <Button variant="ghost" size="icon" aria-label={tr("Удалить категорию: ")+c.name} onClick={()=>setAction({kind:"remove",category:c})}><Trash2 size={17}/></Button>
          </>)}
        </div>
      </div>
    );
  };
  return (
    <section className="category-manager">
      <p className="form-note">{" "}{tr("Добавляйте, переименовывайте и удаляйте любые категории. Денежные суммы сохраняются.")}{" "}</p>
      <div className="category-toolbar">
        <div className="segmented" aria-label={tr("Вид категорий")}>
          <button
            type="button"
            className={type === "INCOME" ? "selected" : ""}
            aria-pressed={type === "INCOME"}
            onClick={() => setType("INCOME")}
          >{" "}{tr("Доходы")}{" "}</button>
          <button
            type="button"
            className={type === "EXPENSE" ? "selected" : ""}
            aria-pressed={type === "EXPENSE"}
            onClick={() => setType("EXPENSE")}
          >{" "}{tr("Расходы")}{" "}</button>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setAction({ kind: "create" })}
        >
          <Plus size={16} />{" "}{tr("Новая категория")}{" "}</Button>
      </div>
      <Input
        aria-label={tr("Поиск категории")}
        placeholder={tr("Найти категорию")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {!query.data ? (
        <Loading />
      ) : (
        <>
          <div className="category-list">
            {rows.filter((c) => c.active).map(row)}
          </div>
          {!rows.some((c) => c.active) && (
            <p className="quiet-empty">{tr("Категорий не найдено.")}</p>
          )}
          {rows.some((c) => !c.active) && (
            <details className="daily-details">
              <summary>{tr("Удалённые категории")}</summary>
              <div className="category-list">
                {rows.filter((c) => !c.active).map(row)}
              </div>
            </details>
          )}
        </>
      )}
      {action && (
        <CategoryAction
          action={action}
          type={type}
          close={() => setAction(null)}
        />
      )}
    </section>
  );
}

function CategoryAction({
  action,
  type,
  close,
}: {
  action: Action;
  type: "INCOME" | "EXPENSE";
  close: () => void;
}) {
  const [name, setName] = useState(action.category?.name ?? ""),
    [error, setError] = useState<Error | null>(null),
    [uncertain, setUncertain] = useState(false);
  const guard = useRef(false),
    refresh = useRefreshFinance(),
    { notify } = useFinanceUi();
  const mutation = useMutation({
    mutationFn: async () => {
      if(action.kind === "create") await api.createCategory(name.trim(),type);
      else if(action.kind === "remove") await api.deleteCategory(action.category!.id);
      else await api.updateCategory(action.category!,name.trim(),action.kind === "restore" || action.category!.active);
    },
    retry: false,
  });
  async function save(e: FormEvent) {
    e.preventDefault();
    if (guard.current || uncertain) return;
    guard.current = true;
    setError(null);
    try {
      await mutation.mutateAsync();
      await refresh();
      notify(
        action.kind === "remove"
          ? tr("Категория удалена из списка")
          : tr("Категории обновлены"),
      );
      close();
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        void refresh();
      }
      if (e instanceof ApiError && e.status === 409) void refresh();
    } finally {
      guard.current = false;
    }
  }
  return (
    <Dialog
      open
      title={
        action.kind === "remove"
          ? tr("Удалить категорию?")
          : action.kind === "restore"
            ? tr("Вернуть категорию?")
            : action.kind === "create"
              ? tr("Новая категория")
              : tr("Переименовать категорию")
      }
      description={
        action.kind === "remove"
          ? tr("Категория будет удалена полностью. Связанные операции останутся без категории, суммы сохранятся. Лимит этой категории будет удалён из бюджета.")
          : tr("Изменение категории не меняет денежные суммы.")
      }
      onClose={close}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={save}>
        {action.kind === "create" || action.kind === "rename" ? (
          <Field label={tr("Название категории")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={mutation.isPending || uncertain}
              autoFocus
            />
          </Field>
        ) : (
          <strong>{name}</strong>
        )}
        <ErrorNotice error={error} />
        {uncertain && (
          <p className="form-note">{" "}{tr("Ответ не получен. Закройте окно и проверьте список перед новым действием.")}{" "}</p>
        )}
        <div className="dialog-footer">
          <Button
            variant="secondary"
            onClick={close}
            disabled={mutation.isPending}
          >{" "}{tr("Отмена")}{" "}</Button>
          <Button type="submit" disabled={mutation.isPending || uncertain}>
            {action.kind === "remove"
              ? tr("Удалить полностью")
              : action.kind === "restore"
                ? tr("Вернуть")
                : tr("Сохранить")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoryManagerDialog({
  type,
  close,
}: {
  type: "INCOME" | "EXPENSE";
  close: () => void;
}) {
  return (
    <Dialog
      open
      title={tr("Категории")}
      description={tr("Ваши категории доходов и расходов.")}
      onClose={close}
    >
      <CategoryManager initialType={type} />
    </Dialog>
  );
}
