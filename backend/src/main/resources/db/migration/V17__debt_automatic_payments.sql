CREATE TABLE debt_automation (
 debt_id uuid PRIMARY KEY REFERENCES debts(id) ON DELETE RESTRICT,
 enabled boolean NOT NULL DEFAULT false,
 account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
 version bigint NOT NULL DEFAULT 0,
 last_error varchar(500), last_attempt timestamptz,
 CHECK(NOT enabled OR account_id IS NOT NULL)
);
CREATE TABLE debt_automatic_executions (
 debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE RESTRICT,
 scheduled_date date NOT NULL,
 payment_id uuid NOT NULL UNIQUE REFERENCES debt_payments(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(debt_id,scheduled_date)
);
CREATE INDEX debt_automation_enabled ON debt_automation(debt_id) WHERE enabled;
