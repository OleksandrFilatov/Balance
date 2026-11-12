import { t as tr } from "@/i18n";
import { LanguageSelect } from "@/components/language-select";
import { NavLink, Link, Outlet, useLocation } from "react-router";
import { useEffect,useLayoutEffect, useState } from "react";
import {useQueryClient} from "@tanstack/react-query";
import {financeKey} from "@/api/queries";
import {
  House,
  Wallet,
  Lightbulb,
  Landmark,
  PiggyBank,
  ChartNoAxesCombined,
  Plus,
  CalendarDays,
  Tags,
  CalendarClock,
  MoreHorizontal,
  LogOut,
  UserRound,
  DoorOpen,
} from "lucide-react";
import { useAuth } from "@/providers/auth";
import { FinanceUiProvider, useFinanceUi } from "@/providers/finance-ui";
import { Button } from "./ui/button";
import { LoginPage } from "@/pages/login";
import { OwnerSetup } from "./owner-setup";
import { ThemeToggle } from "@/providers/theme";
import { BrandMark } from "./brand-mark";
import { HeaderClock } from "./header-clock";
import { Dialog } from "./ui/dialog";
import {SyncStatus} from "./sync-status";
const links = () => ([
  { to: "/", label: tr("Главная"), mobile: tr("Главная"), icon: House },
  { to: "/money", label: tr("Мои деньги"), mobile: tr("Деньги"), icon: Wallet },
  { to: "/personal-expenses", label: tr("Личные расходы"), mobile: tr("Личное"), icon: UserRound },
  {
    to: "/household",
    label: tr("Коммуналка и дом"),
    mobile: tr("Дом"),
    icon: Lightbulb,
  },
  { to: "/debts", label: tr("Долги"), mobile: tr("Долги"), icon: Landmark },
  { to: "/savings", label: tr("Накопления"), mobile: tr("Цели"), icon: PiggyBank },
  { to: "/calendar", label: tr("Календарь платежей"), mobile: tr("Календарь"), icon: CalendarDays },
  {
    to: "/statistics",
    label: tr("Статистика"),
    mobile: tr("Итоги"),
    icon: ChartNoAxesCombined,
  },
]);
const additionalLinks = () => ([
  { to: "/batrachka", label: tr("Батрачка"), icon: DoorOpen },
  {to:"/work-calendar",label:tr("Мои смены"),icon:CalendarDays},
  { to: "/recurring", label: tr("Регулярные платежи"), icon: CalendarClock },
  { to: "/categories", label: tr("Категории"), icon: Tags },
  { to: "/accounts", label: tr("Мои счета"), icon: Wallet },
]);
const mobileLinks = () => (links().slice(0, 5));
const moreLinks = () => ([...links().slice(5), ...additionalLinks()]);
export function AppShell() {
  const { username } = useAuth();
  return username ? (
    <FinanceUiProvider>
      <OwnerSetup />
      <Shell />
    </FinanceUiProvider>
  ) : (
    <LoginPage />
  );
}
function Shell() {
  const queryClient=useQueryClient();
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")void queryClient.invalidateQueries({queryKey:financeKey,refetchType:"active"});};const timer=window.setInterval(refresh,30_000);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};},[queryClient]);
  const { username, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openTransaction } = useFinanceUi(),
    location = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.pathname]);
  const quickExpense = () =>
    openTransaction(undefined, undefined, {
      type: "EXPENSE",
      scope: location.pathname === "/household" ? "HOUSEHOLD" : "PERSONAL",
    });
  const current =
    [...links(), ...additionalLinks()].find(
      (l) =>
        l.to === location.pathname ||
        (l.to !== "/" && location.pathname.startsWith(l.to + "/")),
    )?.label ?? tr("Дополнительно");
  return (
    <div className="app-shell everyday-shell">
      <a className="skip-link" href="#main-content">{" "}{tr("Перейти к содержимому")}{" "}</a>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <BrandMark />
          balance<span className="brand-period">.</span>
        </Link>
        <p className="navigation-caption">{tr("Ежедневные финансы")}</p>
        <nav className="desktop-nav" aria-label={tr("Основная навигация")}>
          {links().map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              className={({ isActive }) =>
                "nav-item " + (isActive ? "active" : "")
              }
            >
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <nav className="additional-nav" aria-label={tr("Другие разделы")}>
          {additionalLinks().map(({to,label,icon:Icon}) => <NavLink key={to} to={to} className={({isActive}) => "nav-item " + (isActive?"active":"")}><Icon size={20}/><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar" aria-hidden="true">{username?.slice(0, 1).toUpperCase()}</span>
          <div><strong>{username}</strong><span>{tr("Личный кабинет")}</span></div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label={tr("Выйти")}><LogOut size={18}/></Button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <Link to="/" className="brand mobile-brand">
            <BrandMark />
            balance.
          </Link>
          <span className="desktop-section">{current}</span>
          <div className="everyday-header-actions">
            {location.pathname !== "/money" && location.pathname !== "/" && (
              <Button className="desktop-quick-expense" onClick={quickExpense}>
                <Plus size={18} />{" "}{tr("Доход / расход")}{" "}</Button>
            )}
            <HeaderClock />
            <SyncStatus />
            <LanguageSelect/>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="page-content" tabIndex={-1}>
          <div className="route-surface" key={location.pathname}><Outlet /></div>
        </main>
      </div>
      <Button
        className="quick-expense-fab"
        aria-label={tr("Доход / расход")}
        onClick={quickExpense}
      >
        <Plus size={20} />
        <span>{tr("Доход / расход")}</span>
      </Button>
      <nav className="mobile-nav" aria-label={tr("Мобильная навигация")}>
        {mobileLinks().map(({ to, label, mobile, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon size={21} />
            <span>{mobile}</span>
          </NavLink>
        ))}
        <button type="button" className={moreLinks().some(l=>l.to===location.pathname)?"active":""} aria-label={tr("Ещё")} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><MoreHorizontal size={21}/><span>{tr("Ещё")}</span></button>
      </nav>
      {menuOpen && <Dialog open title={tr("Разделы Balance")} description={tr("Выберите нужный раздел.")} onClose={() => setMenuOpen(false)}>
        <nav className="more-nav" aria-label={tr("Другие разделы")}>
          {moreLinks().map(({to,label,icon:Icon}) => <Link key={to} to={to} onClick={() => setMenuOpen(false)}><Icon size={20}/>{label}</Link>)}
        </nav>
        <Button variant="secondary" onClick={logout}><LogOut size={17}/>{tr("Выйти")}</Button>
      </Dialog>}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <Button onClick={onAction}>
          <Plus size={18} />
          {action}
        </Button>
      )}
    </div>
  );
}
