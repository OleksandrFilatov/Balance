CREATE TABLE debts(
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, creditor varchar(100) NOT NULL, description varchar(2000) NOT NULL,
 kind varchar(20) NOT NULL CHECK(kind IN ('PERSONAL','BANK_LOAN','INSTALLMENT')),
 original_amount numeric(19,2) NOT NULL CHECK(original_amount>0 AND original_amount<>'NaN'::numeric),
 opening_remaining numeric(19,2) NOT NULL CHECK(opening_remaining>=0 AND opening_remaining<=original_amount AND opening_remaining<>'NaN'::numeric),
 currency varchar(3) NOT NULL CHECK(currency='EUR'),
 annual_rate numeric(9,4) CHECK(annual_rate>=0 AND annual_rate<=1000 AND annual_rate<>'NaN'::numeric),
 monthly_payment numeric(19,2) CHECK(monthly_payment>0 AND monthly_payment<>'NaN'::numeric),
 next_payment date, status varchar(20) NOT NULL CHECK(status IN ('ACTIVE','CLOSED','ARCHIVED')),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, version bigint NOT NULL DEFAULT 0,
 create_key uuid NOT NULL UNIQUE, create_fingerprint text NOT NULL,
 origin varchar(20) NOT NULL CHECK(origin IN ('EXISTING','NEW_LOAN'))
);
ALTER TABLE financial_transactions ADD COLUMN debt_id uuid REFERENCES debts(id) ON DELETE RESTRICT;
ALTER TABLE financial_transactions DROP CONSTRAINT financial_transactions_type_check;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_type_check CHECK(type IN ('INCOME','EXPENSE','TRANSFER','LOAN_RECEIPT','DEBT_PRINCIPAL'));
ALTER TABLE financial_transactions DROP CONSTRAINT transaction_shape;
ALTER TABLE financial_transactions ADD CONSTRAINT transaction_shape CHECK(
 (type='INCOME' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NOT NULL AND scope IS NOT NULL)
 OR (type='EXPENSE' AND debit_account_id IS NOT NULL AND credit_account_id IS NULL AND category_id IS NOT NULL AND scope IS NOT NULL)
 OR (type='TRANSFER' AND debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL AND debit_account_id<>credit_account_id AND category_id IS NULL AND scope IS NULL)
 OR (type='LOAN_RECEIPT' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NULL AND scope IS NULL AND debt_id IS NOT NULL AND status='CONFIRMED')
 OR (type='DEBT_PRINCIPAL' AND debit_account_id IS NOT NULL AND credit_account_id IS NULL AND category_id IS NULL AND scope IS NULL AND debt_id IS NOT NULL AND status='CONFIRMED')
);
CREATE TABLE debt_payments(
 id uuid PRIMARY KEY, debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 principal numeric(19,2) NOT NULL CHECK(principal>=0 AND principal<>'NaN'::numeric),
 interest numeric(19,2) NOT NULL CHECK(interest>=0 AND interest<>'NaN'::numeric),
 operation_date date NOT NULL, description varchar(2000) NOT NULL,
 created_at timestamptz NOT NULL, request_key uuid NOT NULL UNIQUE, fingerprint text NOT NULL,
 principal_transaction_id uuid UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT,
 interest_transaction_id uuid UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT,
 CHECK(principal+interest>0),
 CHECK((principal>0)=(principal_transaction_id IS NOT NULL)),
 CHECK((interest>0)=(interest_transaction_id IS NOT NULL))
);
CREATE INDEX debt_payment_history ON debt_payments(debt_id,operation_date DESC,created_at DESC);
CREATE INDEX debt_transaction_link ON financial_transactions(debt_id) WHERE debt_id IS NOT NULL;
CREATE INDEX debt_upcoming ON debts(next_payment) WHERE status='ACTIVE';
INSERT INTO categories(id,name,type)
 SELECT '00000000-0000-0000-0003-000000000001','Проценты по обязательствам','EXPENSE'
 WHERE NOT EXISTS(SELECT 1 FROM categories WHERE type='EXPENSE' AND lower(btrim(name))=lower('Проценты по обязательствам') AND active);
