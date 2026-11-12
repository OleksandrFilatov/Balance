import { t as tr } from "@/i18n";
import { parse } from "lossless-json";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  Analytics,
  Balances,
  Category,
  Filters,
  Page,
  Summary,
  Transaction,
  TransactionWrite,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
let authorization: string | null = null;
let unauthorized: (() => void) | undefined;
export function onUnauthorized(handler: () => void) {
  unauthorized = handler;
  return () => {
    unauthorized = undefined;
  };
}
export function clearCredentials() {
  authorization = null;
}

// Numeric JSON tokens stay exact decimal strings. Only pagination/version metadata become safe integers.
export function decodeJson(text: string): unknown {
  const metadata = new Set([
    "version",
    "page",
    "size",
    "totalElements",
    "totalPages",
  ]);
  return parse(
    text,
    (key, value) => {
      if (metadata.has(key) && typeof value === "string") {
        const number = Number(value);
        if (!Number.isSafeInteger(number))
          throw new Error(
            tr("Числовой идентификатор превышает безопасный диапазон."),
          );
        return number;
      }
      return value;
    },
    (value) => value,
  );
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  overrideAuth?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");
  const auth = overrideAuth ?? authorization;
  if (auth) headers.set("Authorization", auth);
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      0,
      tr("Не удалось связаться с сервером. Проверьте подключение."),
    );
  }
  if (!response.ok) {
    if (response.status === 401 && authorization && auth === authorization) {
      clearCredentials();
      unauthorized?.();
    }
    const messages: Record<number, string> = {
      400: tr("Проверьте заполненные поля, сумму, валюту и выбранные счета."),
      401: tr("Не удалось войти. Проверьте имя пользователя и пароль."),
      403: tr("Недостаточно прав или сеанс защиты истёк. Войдите снова."),
      404: tr("Запись больше не существует. Обновите список."),
      409: tr("Запись изменилась или запрос уже был выполнен. Обновите данные перед повтором."),
    };
    let explanation: string | undefined;
    try {
      const problem = decodeJson(await response.text()) as { detail?: string };
      const savingsMessages: Record<string, string> = {
        "Сначала отмените перенос коммуналки, затем исправьте зарплаты.":
          tr("За этот месяц есть перенос коммуналки. Сначала отмените перенос в разделе оплат, затем сохраните зарплаты. После этого можно перенести пересчитанную сумму снова."),
        "Сначала отмените оплату этого месяца, затем исправьте зарплаты.":
          tr("За этот месяц уже отмечена оплата коммуналки. Сначала отмените её в истории оплат, затем сохраните зарплаты."),
        "Данные уже изменились. Обновите страницу.":
          tr("Зарплаты этого месяца изменены в другом окне. Обновите данные перед сохранением."),
        "Сначала согласуйте дату долга кнопкой «Перенести график». Платёж не проведён.":
          tr("Сначала согласуйте дату долга кнопкой «Перенести график». Деньги не списаны."),
        "Goal deadline cannot be in the past":
          tr("Дата цели не может быть в прошлом."),
        "End date must not precede first payment":
          tr("Дата окончания должна быть не раньше первого платежа."),
        "Opening amount changed; reload before correcting":
          tr("Начальный остаток уже изменился. Закройте окно и проверьте актуальную сумму перед новым исправлением."),
        "Select an existing account; no accounts were merged":
          tr("Выберите основной счёт в настройках. Существующие деньги и записи сохранены раздельно."),
        "Opening adjustments are immutable; create a new correction":
          tr("Исправление сохранено в истории. Для уточнения создайте новое исправление начального остатка."),
        "Principal exceeds remaining debt":
          tr("Основная часть платежа превышает остаток задолженности."),
        "Only repaid debts may be closed or archived":
          tr("Закрыть или архивировать можно только полностью погашенный долг."),
        "Debt is not active":
          tr("Обязательство уже погашено или находится в архиве."),
        "Restore interest category":
          tr("Восстановите категорию «Проценты по обязательствам» для проведения процентов."),
        "Debt movements are immutable; use debt history":
          tr("Связанное с долгом движение защищено от изменения. Откройте историю долга."),
        "Insufficient free funds":
          tr("Недостаточно свободных средств на выбранном счёте."),
        "Insufficient goal allocation":
          tr("Сумма превышает резерв этой цели на выбранном счёте."),
        "Goal is not fully funded":
          tr("Цель можно отметить достигнутой только после полного резервирования."),
        "Inactive account or goal":
          tr("Для выделения выберите активный счёт и активную цель."),
        "Destination is not active":
          tr("Перераспределение возможно только в активную цель."),
        "Currency mismatch":
          tr("Валюта счёта должна совпадать с валютой цели EUR."),
        "Choose different goals": tr("Выберите другую цель для перераспределения."),
        "Category limits exceed total planned expenses":
          tr("Сумма лимитов категорий превышает общий план расходов. Измените лимиты или общий план."),
        "Budget already exists for this month and scope":
          tr("Бюджет на этот месяц и область уже существует. Обновите страницу."),
        "Source budget not found":
          tr("В выбранном месяце нет бюджета для копирования."),
        "Budget limits require expense categories":
          tr("Лимиты можно задавать только категориям расходов."),
        "Specify the next due date for a partial debt payment":
          tr("При частичном погашении укажите дату следующего платежа."),
        "Next payment must follow the current due date":
          tr("Следующий срок должен быть позже текущей плановой даты."),
        "Debt event is no longer due":
          tr("Событие долга изменилось. Обновите календарь."),
        "Occurrence has been cancelled":
          tr("Это выполнение уже отменено. Обновите календарь."),
        "Only the next unexecuted occurrence can be cancelled":
          tr("Отменить можно только ближайшее непроведённое выполнение."),
        "Calendar range is limited to 62 days":
          tr("Выберите диапазон не более 62 дней."),
        "Too many calendar events; shorten the date range":
          tr("Слишком много событий. Сократите период календаря."),
      };
      explanation = problem.detail
        ? savingsMessages[problem.detail]
        : undefined;
    } catch {
      /* Security and proxy errors may have no JSON body. */
    }
    throw new ApiError(
      response.status,
      explanation ??
        messages[response.status] ??
        tr("Ошибка сервера. Изменения могли сохраниться — проверьте список."),
    );
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  try {
    return decodeJson(text) as T;
  } catch {
    throw new ApiError(
      502,
      tr("Получен некорректный ответ сервера. Изменения могли сохраниться — проверьте список."),
    );
  }
}

export async function write<T>(
  path: string,
  method: string,
  body?: unknown,
  key?: string,
) {
  // Fetch a fresh session-bound token before each mutation. Never disable CSRF or retry a write automatically.
  const csrf = await request<{ headerName: string; token: string }>("/csrf");
  const headers: Record<string, string> = { [csrf.headerName]: csrf.token };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  return request<T>(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
export function queryString(values: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== "" && value !== undefined && value !== null)
      params.set(key, String(value));
  return params.toString();
}
export const api = {
  async registerOwner(username:string,password:string) {
    const previous=authorization;
    const csrf=await request<{headerName:string;token:string}>("/csrf");
    const pending=request<void>("/owner",{method:"POST",headers:{"Content-Type":"application/json",[csrf.headerName]:csrf.token},body:JSON.stringify({username,password})},previous??undefined);
    // Old in-flight requests must not log out the owner while the initial credentials are replaced.
    authorization=null;
    try { await pending; } catch(error) { authorization=previous;throw error; }
  },
  deleteCategory: (id:string) => write<void>("/categories/"+id,"DELETE"),
  async login(username: string, password: string) {
    const bytes = new TextEncoder().encode(username + ":" + password);
    const encoded =
      "Basic " +
      btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
    await request("/csrf", {}, encoded);
    authorization = encoded;
  },
  accounts: (signal?: AbortSignal) =>
    request<Account[]>("/accounts", { signal }),
  balances: (signal?: AbortSignal) =>
    request<Balances>("/balances", { signal }),
  categories: (signal?: AbortSignal) =>
    request<Category[]>("/categories", { signal }),
  transactions: (filter: Filters, signal?: AbortSignal) =>
    request<Page<Transaction>>("/transactions?" + queryString(filter), {
      signal,
    }),
  summary: (from: string, to: string, currency: string, signal?: AbortSignal) =>
    request<Summary>("/summary?" + queryString({ from, to, currency }), {
      signal,
    }),
  analytics: (
    from: string,
    to: string,
    currency: string,
    signal?: AbortSignal,
  ) =>
    request<Analytics>(
      "/summary/expenses?" + queryString({ from, to, currency }),
      { signal },
    ),
  createAccount: (body: AccountCreate) =>
    write<Account>("/accounts", "POST", body),
  updateAccount: (id: string, body: AccountUpdate) =>
    write<Account>("/accounts/" + id, "PUT", body),
  createCategory: (name: string, type: "INCOME" | "EXPENSE") =>
    write<Category>("/categories", "POST", { name, type }),
  updateCategory: (category: Category, name: string, active: boolean) =>
    write<Category>("/categories/" + category.id, "PUT", {name, active, version: category.version}),
  createTransaction: (body: TransactionWrite, key: string) =>
    write<Transaction>("/transactions", "POST", body, key),
  updateTransaction: (transaction: Transaction, body: TransactionWrite) =>
    write<Transaction>("/transactions/" + transaction.id, "PUT", {
      transaction: body,
      version: transaction.version,
    }),
  deleteTransaction: (transaction: Transaction) =>
    write<void>(
      "/transactions/" + transaction.id + "?version=" + transaction.version,
      "DELETE",
    ),
};
