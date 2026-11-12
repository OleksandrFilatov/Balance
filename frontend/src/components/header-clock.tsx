import { getLocale } from "@/i18n";
import { t as tr } from "@/i18n";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

const zone = "Europe/Berlin";
const dateFormat = () => (new Intl.DateTimeFormat(getLocale(), {
  timeZone: zone, weekday: "short", day: "numeric", month: "long",
}));
const shortDateFormat = () => (new Intl.DateTimeFormat(getLocale(), {
  timeZone: zone, day: "2-digit", month: "2-digit", year: "numeric",
}));
const timeFormat = () => (new Intl.DateTimeFormat(getLocale(), {
  timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
}));

export function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <div className="header-clock" title={tr("Дата и время · Берлин")} role="timer" aria-live="off" aria-label={tr("Текущее время в Берлине")}>
    <span className="header-clock-icon" aria-hidden="true"><CalendarDays size={18}/></span>
    <div className="header-clock-content">
      <span className="header-clock-date"><span className="clock-date-full">{dateFormat().format(now)}</span><span className="clock-date-short">{shortDateFormat().format(now)}</span></span>
      <time dateTime={now.toISOString()}>{timeFormat().format(now)}</time>
    </div>
  </div>;
}
