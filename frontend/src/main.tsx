import { useSyncExternalStore } from "react";
import { getLanguage, subscribeLanguage } from "@/i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Loading } from "@/components/feedback";
import { NotFoundPage } from "@/pages/not-found";
import { AuthProvider } from "@/providers/auth";
import { ThemeProvider } from "@/providers/theme";
import { queryRetry } from "@/api/queries";
import "./index.css";

const DashboardPage = lazy(() =>
  import("@/pages/dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const AccountsPage = lazy(() =>
  import("@/pages/accounts").then((module) => ({
    default: module.AccountsPage,
  })),
);
const TransactionsPage = lazy(() =>
  import("@/pages/transactions").then((module) => ({
    default: module.TransactionsPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: queryRetry },
    mutations: { retry: false },
  },
});
const MoneyPage = lazy(() =>
  import("@/pages/money").then((m) => ({ default: m.MoneyPage })),
);
const HouseholdPage = lazy(() =>
  import("@/pages/household").then((m) => ({ default: m.HouseholdPage })),
);
const StatisticsPage = lazy(() =>
  import("@/pages/statistics").then((m) => ({ default: m.StatisticsPage })),
);
const CategoriesPage = lazy(() =>
  import("@/pages/categories").then((m) => ({ default: m.CategoriesPage })),
);
const SavingsPage = lazy(() =>
  import("@/pages/savings").then((m) => ({ default: m.SavingsPage })),
);
const GoalDetailsPage = lazy(() =>
  import("@/pages/savings").then((m) => ({ default: m.GoalDetailsPage })),
);
const DebtsPage = lazy(() =>
  import("@/pages/debts").then((m) => ({ default: m.DebtsPage })),
);
const DebtDetailsPage = lazy(() =>
  import("@/pages/debts").then((m) => ({ default: m.DebtDetailsPage })),
);
const RecurringPage = lazy(() =>
  import("@/pages/recurring").then((m) => ({ default: m.RecurringPage })),
);
const PersonalExpensesPage = lazy(() =>
  import("@/pages/recurring").then((m) => ({ default: m.PersonalExpensesPage })),
);
const BudgetsPage = lazy(() =>
  import("@/pages/budgets").then((m) => ({ default: m.BudgetsPage })),
);
const CalendarPage = lazy(() =>
  import("@/pages/calendar").then((m) => ({ default: m.CalendarPage })),
);
const WorkCalendarPage = lazy(()=>import("@/pages/work-calendar").then(m=>({default:m.WorkCalendarPage})));
const BatrachkaPage = lazy(() => import("@/pages/batrachka").then(m => ({ default: m.BatrachkaPage })));
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { path: "batrachka", element: <Suspense fallback={<Loading />}><BatrachkaPage /></Suspense> },
      {path:"work-calendar",element:<Suspense fallback={<Loading/>}><WorkCalendarPage/></Suspense>},
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: "accounts",
        element: (
          <Suspense fallback={<Loading />}>
            <AccountsPage />
          </Suspense>
        ),
      },
      {
        path: "transactions",
        element: (
          <Suspense fallback={<Loading />}>
            <TransactionsPage />
          </Suspense>
        ),
      },
      {
        path: "savings",
        element: (
          <Suspense fallback={<Loading />}>
            <SavingsPage />
          </Suspense>
        ),
      },
      {
        path: "savings/:id",
        element: (
          <Suspense fallback={<Loading />}>
            <GoalDetailsPage />
          </Suspense>
        ),
      },
      {
        path: "debts",
        element: (
          <Suspense fallback={<Loading />}>
            <DebtsPage />
          </Suspense>
        ),
      },
      {
        path: "debts/:id",
        element: (
          <Suspense fallback={<Loading />}>
            <DebtDetailsPage />
          </Suspense>
        ),
      },
      {
        path: "recurring",
        element: (
          <Suspense fallback={<Loading />}>
            <RecurringPage />
          </Suspense>
        ),
      },
      {
        path: "personal-expenses",
        element: <Suspense fallback={<Loading />}><PersonalExpensesPage /></Suspense>,
      },
      {
        path: "budgets",
        element: (
          <Suspense fallback={<Loading />}>
            <BudgetsPage />
          </Suspense>
        ),
      },
      {
        path: "calendar",
        element: (
          <Suspense fallback={<Loading />}>
            <CalendarPage />
          </Suspense>
        ),
      },
      {
        path: "money",
        element: (
          <Suspense fallback={<Loading />}>
            <MoneyPage />
          </Suspense>
        ),
      },
      {
        path: "household",
        element: (
          <Suspense fallback={<Loading />}>
            <HouseholdPage />
          </Suspense>
        ),
      },
      {
        path: "statistics",
        element: (
          <Suspense fallback={<Loading />}>
            <StatisticsPage />
          </Suspense>
        ),
      },
      {
        path: "categories",
        element: (
          <Suspense fallback={<Loading />}>
            <CategoriesPage />
          </Suspense>
        ),
      },
      { path: "settings", element: <Navigate to="/categories" replace /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function LocalizedRouter() {
  const language=useSyncExternalStore(subscribeLanguage,getLanguage);
  return <RouterProvider key={language} router={router}/>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LocalizedRouter />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
