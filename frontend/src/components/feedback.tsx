import { t as tr } from "@/i18n";
import { AlertCircle, ArrowRight, RefreshCw, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
export function ErrorNotice({
  error,
  retry,
}: {
  error: Error | null | undefined;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>{tr("Не удалось выполнить запрос")}</strong>
        <p>{tr(error.message)}</p>
      </div>
      {retry && (
        <Button
          variant="ghost"
          size="icon"
          onClick={retry}
          aria-label={tr("Повторить загрузку")}
        >
          <RefreshCw size={17} />
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Wallet size={25} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button variant="secondary" onClick={onAction}>
          {action}
          <ArrowRight size={16} />
        </Button>
      )}
    </div>
  );
}
export function Loading({ label = "Загружаем данные" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-label={label}>
      <div className="skeleton h-5 w-36" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-12 w-full" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
