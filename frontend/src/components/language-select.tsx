import { useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { getLanguageSelection, setLanguage, subscribeLanguage, t as tr, type LanguageSelection } from "@/i18n";

export function LanguageSelect() {
  const selected = useSyncExternalStore(subscribeLanguage, getLanguageSelection);
  return <label className="language-select" title={tr("Язык интерфейса")}>
    <Languages size={17} aria-hidden="true" />
    <select aria-label={tr("Язык интерфейса")} value={selected}
      onChange={event => setLanguage(event.target.value as LanguageSelection)}>
      <option value="auto">{tr("Как на устройстве")}</option>
      <option value="ru" lang="ru">Русский</option>
      <option value="de" lang="de">Deutsch</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
