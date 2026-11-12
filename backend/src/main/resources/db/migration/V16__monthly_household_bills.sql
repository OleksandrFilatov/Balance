CREATE TABLE household_bill_months (
 month date PRIMARY KEY CHECK(extract(day FROM month)=1),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE household_bill_payments (
 id uuid PRIMARY KEY,
 month date NOT NULL REFERENCES household_bill_months(month),
 person varchar(4) NOT NULL CHECK(person IN ('MINE','IRA')),
 request_key uuid NOT NULL UNIQUE, fingerprint varchar(64) NOT NULL,
 amount numeric(19,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 account_id uuid REFERENCES accounts(id), operation_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz, cancellation_reason varchar(500),
 CHECK((person='IRA' AND account_id IS NULL) OR person='MINE'),
 CHECK((cancelled_at IS NULL AND cancellation_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) BETWEEN 1 AND 500))
);
CREATE TABLE household_bill_items (
 id uuid PRIMARY KEY, month date NOT NULL REFERENCES household_bill_months(month),
 template_id uuid NOT NULL REFERENCES recurring_templates(id), occurrence_date date NOT NULL,
 category_id uuid NOT NULL REFERENCES categories(id), name varchar(100) NOT NULL,
 split varchar(16) NOT NULL CHECK(split IN ('PROPORTIONAL','EQUAL')),
 amount numeric(19,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 mine numeric(19,2), ira numeric(19,2),
 legacy_transaction_id uuid REFERENCES financial_transactions(id),
 mine_payment_id uuid REFERENCES household_bill_payments(id), ira_payment_id uuid REFERENCES household_bill_payments(id),
 voided boolean NOT NULL DEFAULT false,
 UNIQUE(template_id,occurrence_date),
 CHECK(date_trunc('month',occurrence_date)::date=month),
 CHECK((mine IS NULL AND ira IS NULL) OR (mine IS NOT NULL AND ira IS NOT NULL AND mine>=0 AND ira>=0 AND mine+ira=amount AND mine<>'NaN'::numeric AND ira<>'NaN'::numeric))
);
ALTER TABLE financial_transactions ADD COLUMN household_payment_id uuid REFERENCES household_bill_payments(id);
CREATE INDEX household_bill_items_month ON household_bill_items(month) WHERE NOT voided;
CREATE INDEX household_bill_payments_month ON household_bill_payments(month,created_at DESC);
