import { t as tr } from "@/i18n";
import { Link } from "react-router";
export function NotFoundPage() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404</span>
      <h1>{tr("Страница не найдена")}</h1>
      <p>{tr("Такого раздела в Balance пока нет.")}</p>
      <Link className="button button-primary" to="/">{" "}{tr("На главную")}{" "}</Link>
    </div>
  );
}
