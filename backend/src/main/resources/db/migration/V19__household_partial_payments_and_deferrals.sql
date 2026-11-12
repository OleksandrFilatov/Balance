-- Allocation records extend existing settlements; all historical payments remain unchanged.
CREATE TABLE household_bill_payment_parts (
 payment_id uuid NOT NULL REFERENCES household_bill_payments(id),
 item_id uuid NOT NULL REFERENCES household_bill_items(id),
 amount numeric(19,2) NOT NULL CHECK(amount>0 AND amount<>'NaN'::numeric),
 PRIMARY KEY(payment_id,item_id)
);
CREATE INDEX household_bill_parts_item ON household_bill_payment_parts(item_id);

-- A due-date plan, never a bank movement or another financial debt.
CREATE TABLE household_bill_deferrals (
 month date PRIMARY KEY REFERENCES household_bill_months(month),
 target_month date NOT NULL CHECK(extract(day FROM target_month)=1),
 amount numeric(19,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 version bigint NOT NULL CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(target_month>month)
);
CREATE TABLE household_bill_deferral_history (
 request_key uuid PRIMARY KEY, month date NOT NULL REFERENCES household_bill_months(month),
 target_month date NOT NULL, amount numeric(19,2) NOT NULL CHECK(amount>=0 AND amount<>'NaN'::numeric),
 fingerprint varchar(64) NOT NULL, action varchar(6) NOT NULL CHECK(action IN ('DEFER','CANCEL')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX household_bill_deferral_history_month ON household_bill_deferral_history(month,created_at);
