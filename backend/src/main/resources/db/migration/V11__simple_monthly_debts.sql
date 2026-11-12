CREATE TABLE debt_monthly_plans (
 debt_id uuid PRIMARY KEY REFERENCES debts(id) ON DELETE RESTRICT,
 first_date date NOT NULL,
 end_date date NOT NULL CHECK(end_date >= first_date),
 monthly_amount numeric(19,2) NOT NULL CHECK(monthly_amount > 0)
);
