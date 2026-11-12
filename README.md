# Balance

**A personal project by [OleksandrFilatov](https://github.com/OleksandrFilatov): a self-hosted web app for personal finances, shared household expenses, and savings goals.**

Balance brings together your current money, upcoming commitments, and projected balance after payments. It uses your own PostgreSQL database and is designed for self-hosting.

> **How this project was built:** I defined the features, user flows, and visual direction, tested the results through everyday use, and refined the requirements. The application code was generated and iteratively developed using **OpenAI Codex**, rather than written by me manually, line by line. This is my personal project, which I directed through prompts and feedback.

## Features

- **Personal finances:** accounts, income, expenses, transaction history, and balances. Review past months and forecast upcoming payments.
- **Shared household expenses:** split fixed household bills in proportion to two participants' incomes, and split additional purchases 50/50. Participant names are customisable.
- **Monthly planning:** salaries and agreed amounts belong to specific months. Unpaid household bills carry forward, with support for partial payments and deferring the remaining amount to the following month.
- **Debts and instalments:** payment schedules, repayment progress, upcoming due dates, history, and manual management. Scheduled payments can be recorded automatically while the server is running.
- **Savings goals:** reserve existing money for goals, track progress, and calculate contributions. Each goal card shows how much to save per month to reach its target date, accounting for money already saved.
- **Calendar and statistics:** upcoming payments, your personal share of household bills, debt repayments, and income and expense charts.
- **Work-shift calendar:** track working hours, unpaid breaks, hourly rates, and estimated earnings. An approximate German net salary calculation is available for supported 2026 employment conditions.
- **Interface:** English, German, and Russian; automatic device-language detection; a remembered language preference; light and dark themes; and a responsive layout.
- **Work wall:** an interactive scene with tally marks linked to completed workdays.

Forecasts and allocations help you plan your money. Balance **does not connect to your bank or initiate bank transfers**: confirming or automating a payment creates a bookkeeping entry within the app.

## Tech stack

| Area | Technologies |
|---|---|
| Backend | Java 25, Spring Boot 4, Spring MVC / REST API |
| Data | PostgreSQL 18, Spring Data JPA / Hibernate, JDBC, Flyway |
| Authentication and security | Spring Security, BCrypt, CSRF protection |
| Frontend | React 19, TypeScript, Vite, React Router |
| Server state and data fetching | TanStack Query |
| UI | Tailwind CSS, custom CSS, Radix UI, Lucide |
| Charts | Recharts |
| Build and testing | Maven Wrapper, npm, JUnit, Spring Boot Test, embedded PostgreSQL, Playwright |
| Development process | OpenAI Codex, guided by requirements and iterative feedback |

## Getting started

You need **JDK 25, PostgreSQL 18, and Node.js 24 with npm**. Install PostgreSQL separately. Run the commands from the project root unless stated otherwise.

### 1. Create a database

```sh
psql -U postgres -f scripts/setup-db.sql
```

The script prompts for the application database role's password. Choose your own password.

### 2. Set environment variables

```text
DB_URL=jdbc:postgresql://localhost:5432/balance_db
DB_USERNAME=balance_app
DB_PASSWORD=<your database password>
BALANCE_LOCAL_USERNAME=<your initial sign-in username>
BALANCE_LOCAL_PASSWORD=<your strong initial sign-in password>
```

Use `.env.example` as a reference; `.env` files are not loaded automatically. The initial sign-in password must contain at least 16 characters and no more than 72 UTF-8 bytes. There is no shared production password in this repository.

### 3. Build the frontend

```sh
npm --prefix frontend ci
npm --prefix frontend run build
```

### 4. Build the application

From the `backend` directory:

```sh
./mvnw -Pfrontend package
```

On Windows, use `mvnw.cmd -Pfrontend package`.

### 5. Start the server

From the project root:

```sh
java -jar backend/target/balance-0.0.1-SNAPSHOT.jar --spring.profiles.active=local-finance
```

### 6. Open Balance

Visit **http://127.0.0.1:8080**, sign in with the credentials you configured, and create your permanent owner account when prompted.

A fresh installation includes standard categories but no personal financial records or household member names. Set participant names under **Bills & household > Members**. Change the language on the sign-in screen or in the app header.

## Testing

```sh
# Frontend: TypeScript checks and production build
npm --prefix frontend run build

# Backend on Windows, from the project root
backend/mvnw.cmd -f backend/pom.xml test

# Backend on macOS / Linux
(cd backend && ./mvnw test)
```

Browser tests require a separate `UiTestServer` started with `-Dbalance.ui-test.enabled=true`, with test classes and dependencies on the classpath. They check for an isolated database marker. Test credentials are synthetic and specified in the scenarios. Never run these tests against your personal database. The public source includes tests using synthetic data; private historical regression fixtures are excluded.

## Scope and limitations

- Each installation has one owner account. Household members are participants in expense calculations, not separate authenticated accounts with individual permissions.
- Schedulers require the server to be running. They record bookkeeping entries and are not bank standing orders.
- The salary estimator covers supported standard-employment conditions in Germany for 2026, tax class I, without church tax. It does not cover every tax year or employment arrangement.
- Back up PostgreSQL before updating. Do not edit applied migrations or delete data directories.
- By default, the server listens only on the local address. Access from other devices requires separately configured secure connectivity.

## Privacy

These public sources were prepared separately from the working installation. The repository excludes the owner's database, personal reports, passwords, certificates, logs, and original local Git history. Test credentials are examples for isolated testing, not credentials for a working installation.
