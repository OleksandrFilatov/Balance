CREATE TABLE recurring_templates(
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, description varchar(1500) NOT NULL,
 type varchar(20) NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
 amount numeric(19,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 currency varchar(3) NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 scope varchar(20) NOT NULL CHECK(scope IN ('PERSONAL','HOUSEHOLD')),
 frequency varchar(20) NOT NULL CHECK(frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
 original_first_date date NOT NULL, first_date date NOT NULL, next_date date, next_index bigint NOT NULL DEFAULT 0 CHECK(next_index>=0),
 status varchar(20) NOT NULL CHECK(status IN ('ACTIVE','PAUSED','ARCHIVED')),
 automatic boolean NOT NULL DEFAULT false, last_error varchar(500),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, version bigint NOT NULL DEFAULT 0,
 FOREIGN KEY(account_id,currency) REFERENCES accounts(id,currency) ON DELETE RESTRICT,
 FOREIGN KEY(category_id,type) REFERENCES categories(id,type) ON DELETE RESTRICT,
 CHECK(first_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
 CHECK(next_date IS NULL OR next_date>=first_date)
);
CREATE TABLE recurring_executions(
 id uuid PRIMARY KEY, template_id uuid NOT NULL REFERENCES recurring_templates(id) ON DELETE RESTRICT,
 occurrence_date date NOT NULL, transaction_id uuid NOT NULL UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT,
 mode varchar(20) NOT NULL CHECK(mode IN ('MANUAL','AUTOMATIC')), created_at timestamptz NOT NULL,
 UNIQUE(template_id,occurrence_date)
);
ALTER TABLE financial_transactions ADD COLUMN recurring_id uuid REFERENCES recurring_templates(id) ON DELETE RESTRICT;
CREATE INDEX recurring_due ON recurring_templates(next_date) WHERE status='ACTIVE';
CREATE INDEX recurring_history ON recurring_executions(template_id,occurrence_date DESC);
