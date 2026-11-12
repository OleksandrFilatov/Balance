import { t as tr } from "@/i18n";
import { LanguageSelect } from "@/components/language-select";
import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/auth";
import { ThemeToggle } from "@/providers/theme";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/feedback";
import { BrandMark } from "@/components/brand-mark";
export function LoginPage() {
  const auth = useAuth();
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await auth.login(
        String(data.get("username")).trim(),
        String(data.get("password")),
      );
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page login-screen">
      <div className="login-theme">
        <LanguageSelect/>
            <ThemeToggle />
      </div>
      <div className="login-card">
        <a className="brand" href="/">
          <BrandMark />
          balance<span className="brand-period">.</span>
        </a>
        <div className="login-intro">
          <span className="eyebrow">{tr("ВАШ ЛИЧНЫЙ КАБИНЕТ")}</span>
          <h1>{tr("С возвращением.")}</h1>
          <p>{tr("Войдите, чтобы продолжить управлять своими деньгами.")}</p>
        </div>
        <form onSubmit={submit} className="form-stack">
          <Field label={tr("Имя пользователя")}>
            <Input
              name="username"
              autoComplete="username"
              required
              maxLength={100}
              autoFocus
              disabled={busy}
            />
          </Field>
          <Field label={tr("Пароль")}>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </Field>
          <ErrorNotice error={error} />
          <Button type="submit" disabled={busy} className="login-submit">
            {busy ? tr("Входим…") : tr("Войти в Balance")}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="login-footnote">
          <ShieldCheck size={16} />{" "}{tr("Пароль не сохраняется в браузере")}{" "}</p>
      </div>
    </main>
  );
}
