CREATE TABLE monthly_budgets (
 id uuid PRIMARY KEY,
 month date NOT NULL CHECK (month BETWEEN DATE '0001-01-01' AND DATE '9999-12-01' AND extract(day FROM month)=1),
 scope varchar(20) NOT NULL CHECK (scope IN ('PERSONAL','HOUSEHOLD')),
 currency varchar(3) NOT NULL DEFAULT 'EUR' CHECK (currency='EUR'),
 planned_income numeric(19,2) NOT NULL CHECK (planned_income>=0 AND planned_income<>'NaN'::numeric),
 planned_expense numeric(19,2) NOT NULL CHECK (planned_expense>=0 AND planned_expense<>'NaN'::numeric),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 version bigint NOT NULL DEFAULT 0,
 UNIQUE(month,scope)
);
CREATE TABLE budget_category_limits (
 budget_id uuid NOT NULL REFERENCES monthly_budgets(id) ON DELETE RESTRICT,
 category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 category_type varchar(20) NOT NULL DEFAULT 'EXPENSE' CHECK(category_type='EXPENSE'),
 amount numeric(19,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 PRIMARY KEY(budget_id,category_id),
 FOREIGN KEY(category_id,category_type) REFERENCES categories(id,type) ON DELETE RESTRICT
);
CREATE INDEX budget_history ON monthly_budgets(scope,month DESC);
CREATE INDEX budget_actuals ON financial_transactions(scope,operation_date,category_id)
 WHERE status='CONFIRMED' AND NOT deleted AND type IN ('INCOME','EXPENSE','REVERSAL');
