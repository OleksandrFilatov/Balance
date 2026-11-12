import { t } from ".";

// Only unchanged built-in names are translated. User-created and renamed categories stay verbatim.
const defaults: Record<string, string> = {
  "00000000-0000-0000-0001-000000000001": "Продукты",
  "00000000-0000-0000-0001-000000000002": "Аренда",
  "00000000-0000-0000-0001-000000000003": "Электричество",
  "00000000-0000-0000-0001-000000000004": "Интернет",
  "00000000-0000-0000-0001-000000000005": "Транспорт",
  "00000000-0000-0000-0001-000000000006": "Покупки",
  "00000000-0000-0000-0001-000000000007": "Развлечения",
  "00000000-0000-0000-0001-000000000008": "Здоровье",
  "00000000-0000-0000-0001-000000000009": "Другое",
  "00000000-0000-0000-0002-000000000001": "Зарплата",
  "00000000-0000-0000-0002-000000000002": "Дополнительный доход",
  "00000000-0000-0000-0002-000000000003": "Возврат средств",
  "00000000-0000-0000-0002-000000000004": "Другое",
  "00000000-0000-0000-0003-000000000001": "Проценты по обязательствам",
  "00000000-0000-0000-0004-000000000001": "Вода",
  "00000000-0000-0000-0004-000000000002": "Подписки",
};
type Named = {id?: string; categoryId?: string; name: string};
export function categoryName(value: Named): string;
export function categoryName(value: Named | null | undefined): string | undefined;
export function categoryName(value: Named | null | undefined) {
  if (!value) return undefined;
  const original = defaults[value.id ?? value.categoryId ?? ""];
  return original && original === value.name ? t(original) : value.name;
}
