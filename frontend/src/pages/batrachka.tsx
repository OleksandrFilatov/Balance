import { localizeBatrachka } from "@/i18n/batrachka";
import { t as tr } from "@/i18n";
﻿import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { request } from "@/api/client";
import { financeKey } from "@/api/queries";
import { berlinToday } from "@/lib/calendar-dates";
import { ErrorNotice } from "@/components/feedback";
import { PageHeading } from "@/components/app-shell";
import scene from "@/assets/batrachka.html?raw";
import "@/styles/batrachka.css";

const STORAGE_KEY = "balance-batrachka-animation-v3";
const validCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;

function initialDocument() {
  let drawnDays = 0;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (validCount(saved)) drawnDays = saved;
  } catch { /* Browser storage is optional; work marks come from PostgreSQL. */ }
  return localizeBatrachka(scene).replace('  <script>', `  <script>window.balanceBatrachkaInitial = {drawnDays: ${drawnDays}};</script>\n  <script>`);
}

export function BatrachkaPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [document] = useState(initialDocument);
  const [ready, setReady] = useState(false);
  const today = berlinToday();
  const days = useQuery({
    queryKey: [...financeKey, "all-completed-work-days", today],
    queryFn: ({ signal }) => request<{from: string | null; through: string; total: string}>(
      "/work-calendar/completed-days", {signal}),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  useEffect(() => {
    if (!ready || !days.data) return;
    const total = Number(days.data.total);
    if (!validCount(total)) return;
    frame.current?.contentWindow?.postMessage({type: "balance:batrachka-work-days", date: days.data.from, total}, "*");
  }, [ready, days.data, days.dataUpdatedAt]);

  useEffect(() => {
    function saveScene(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null") return;
      if (event.data?.type === "balance:batrachka-ready") { setReady(true); return; }
      if (event.data?.type !== "balance:batrachka-state" || !validCount(event.data.state?.drawnDays)) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.state.drawnDays)); }
      catch { /* Private browsing can deny storage; keep the current session usable. */ }
    }
    window.addEventListener("message", saveScene);
    return () => window.removeEventListener("message", saveScene);
  }, []);

  return <section className="batrachka-page">
    <PageHeading title={tr("Батрачка")} description={tr("Один отмеченный рабочий день — одна чёрточка на стене.")} />
    <div className="batrachka-work-summary" aria-live="polite">
      <span data-testid="batrachka-work-total">{days.isPending ? tr("Загружаем рабочие дни…") : days.isError ? tr("Не удалось обновить рабочие дни") : tr("Отмечено рабочих дней: {0}", days.data.total)}</span>
      <Link to="/work-calendar">{tr("Отметить рабочий день →")}</Link>
    </div>
    <ErrorNotice error={days.error} retry={() => { void days.refetch(); }} />
    <div className="batrachka-stage">
      <iframe ref={frame} title={tr("Батрачка — Не смотри")} srcDoc={document}
        sandbox="allow-scripts" referrerPolicy="no-referrer" />
    </div>
    <p className="batrachka-caption">{tr("Все отработанные дни берутся из отметок в «Моих сменах» автоматически.")}</p>
  </section>;
}
