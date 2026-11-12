import { getLanguage, t } from ".";

/** Localise the trusted bundled scene before it enters its sandboxed iframe. */
export function localizeBatrachka(source: string) {
  const start = source.indexOf("  <script>");
  if (start < 0) return source;
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const markup = source.slice(0, start).replace('<html lang="ru">', `<html lang="${getLanguage()}">`)
    .replace(/(aria-label|content)="([^"]*)"/g, (_match, attribute: string, value: string) => `${attribute}="${/[А-Яа-яЁё]/.test(value) ? escape(t(value)) : value}"`)
    .replace(/>([^<>]*[А-Яа-яЁё][^<>]*)</g, (_match, text: string) => `>${escape(t(text.trim()))}<`);
  const messages: Record<string, string> = {};
  let script = source.slice(start).replace('`На стене отмечено рабочих дней: ${count}.`',
    'window.balanceTranslate("На стене отмечено рабочих дней: {0}.").replace("{0}", String(count))');
  script = script.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (literal: string) => {
    let value: string;
    try { value = JSON.parse(literal) as string; } catch { return literal; }
    if (!/[А-Яа-яЁё]/.test(value)) return literal;
    messages[value] = t(value);
    // The count template already calls balanceTranslate; its argument stays a source key.
    return value.includes("{0}") ? literal : `window.balanceTranslate(${literal})`;
  });
  const json = JSON.stringify(messages).replaceAll("<", "\\u003c");
  return markup + `<script>window.balanceTranslations=${json};window.balanceTranslate=function(key){return window.balanceTranslations[key]||key;};</script>\n` + script;
}

