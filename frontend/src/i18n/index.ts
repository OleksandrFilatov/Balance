import en from "./en.json" with { type: "json" };
import de from "./de.json" with { type: "json" };

export type Language = "ru" | "en" | "de";
export type LanguageSelection = Language | "auto";
const storageKey = "balance-language";
const supported = (value: string): value is Language => ["ru", "en", "de"].includes(value);
export function deviceLanguage(languages: readonly string[]): Language {
  for (const tag of languages) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (supported(base)) return base;
  }
  return "en";
}
function storedSelection(): LanguageSelection {
  try {
    const value = localStorage.getItem(storageKey);
    if (value && supported(value)) return value;
  } catch { /* Language selection remains usable when browser storage is denied. */ }
  return "auto";
}
let selection = storedSelection();
const detected = () => deviceLanguage(typeof window === "undefined" ? ["ru"] : navigator.languages);
let language: Language = selection === "auto" ? detected() : selection;
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLanguageSelection = () => selection;
export const getLocale = () => ({ru: "ru-RU", en: "en-GB", de: "de-DE"})[language];
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function update(next: LanguageSelection) {
  selection = next;
  language = next === "auto" ? detected() : next;
  if (typeof document !== "undefined") document.documentElement.lang = language;
  for (const listener of listeners) listener();
}
export function setLanguage(next: LanguageSelection) {
  if (next !== "auto" && !supported(next)) return;
  try { localStorage.setItem(storageKey, next); } catch { /* Keep the session preference. */ }
  update(next);
}
if (typeof window !== "undefined") {
  document.documentElement.lang = language;
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) update(storedSelection());
  });
  window.addEventListener("languagechange", () => { if (selection === "auto") update("auto"); });
}
const dictionaries: Record<Exclude<Language, "ru">, Record<string, string>> = {en, de};
/** Source phrases are keys. Interpolated values remain text, never HTML. */
export function t(source: string, ...values: (string | number | bigint | null | undefined)[]): string {
  const translated = language === "ru" ? source : dictionaries[language][source] ?? source;
  return translated.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = values[Number(index)];
    return value === undefined ? match : value === null ? "—" : String(value);
  });
}

