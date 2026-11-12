-- Only user cancellation decisions are persisted; generated calendar dates are not stored.
CREATE TABLE recurring_cancellations (
 id uuid PRIMARY KEY,
 template_id uuid NOT NULL REFERENCES recurring_templates(id) ON DELETE RESTRICT,
 occurrence_date date NOT NULL CHECK(occurrence_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
 name varchar(100) NOT NULL, type varchar(20) NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
 amount numeric(19,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 currency varchar(3) NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 reason varchar(500) NOT NULL CHECK(length(btrim(reason))>0), created_at timestamptz NOT NULL,
 UNIQUE(template_id,occurrence_date)
);
CREATE INDEX recurring_cancellations_date ON recurring_cancellations(currency,occurrence_date);
-- NULL for historical payments whose scheduled date cannot be established reliably.
ALTER TABLE debt_payments ADD COLUMN scheduled_date date
 CHECK(scheduled_date IS NULL OR scheduled_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31');
CREATE INDEX debt_payment_schedule ON debt_payments(debt_id,scheduled_date);
