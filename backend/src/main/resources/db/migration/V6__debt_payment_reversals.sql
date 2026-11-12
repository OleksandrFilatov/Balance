ALTER TABLE financial_transactions ADD COLUMN reversal_of uuid UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT;
ALTER TABLE financial_transactions DROP CONSTRAINT financial_transactions_type_check;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_type_check CHECK(type IN ('INCOME','EXPENSE','TRANSFER','LOAN_RECEIPT','DEBT_PRINCIPAL','REVERSAL'));
ALTER TABLE financial_transactions DROP CONSTRAINT transaction_shape;
ALTER TABLE financial_transactions ADD CONSTRAINT transaction_shape CHECK(
 (type='INCOME' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NOT NULL AND scope IS NOT NULL AND reversal_of IS NULL)
 OR (type='EXPENSE' AND debit_account_id IS NOT NULL AND credit_account_id IS NULL AND category_id IS NOT NULL AND scope IS NOT NULL AND reversal_of IS NULL)
 OR (type='TRANSFER' AND debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL AND debit_account_id<>credit_account_id AND category_id IS NULL AND scope IS NULL AND reversal_of IS NULL)
 OR (type='LOAN_RECEIPT' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NULL AND scope IS NULL AND debt_id IS NOT NULL AND status='CONFIRMED' AND reversal_of IS NULL)
 OR (type='DEBT_PRINCIPAL' AND debit_account_id IS NOT NULL AND credit_account_id IS NULL AND category_id IS NULL AND scope IS NULL AND debt_id IS NOT NULL AND status='CONFIRMED' AND reversal_of IS NULL)
 OR (type='REVERSAL' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NULL AND scope IS NULL AND debt_id IS NOT NULL AND status='CONFIRMED' AND reversal_of IS NOT NULL)
);
CREATE TABLE debt_payment_reversals(
 id uuid PRIMARY KEY, payment_id uuid NOT NULL UNIQUE REFERENCES debt_payments(id) ON DELETE RESTRICT,
 operation_date date NOT NULL, reason varchar(500) NOT NULL CHECK(length(btrim(reason))>0),
 created_at timestamptz NOT NULL, request_key uuid NOT NULL UNIQUE, fingerprint text NOT NULL
);
-- Economic effects for statistics: a correction offsets the original classification on its own date.
-- Bank balances continue to use the actual positive debit/credit movements.
CREATE VIEW financial_effects AS
 SELECT t.id, CASE WHEN t.type='REVERSAL' THEN o.type ELSE t.type END AS type,
 CASE WHEN t.type='REVERSAL' THEN -t.amount ELSE t.amount END AS amount,
 t.currency,t.debit_account_id,t.credit_account_id,
 CASE WHEN t.type='REVERSAL' THEN o.category_id ELSE t.category_id END AS category_id,
 CASE WHEN t.type='REVERSAL' THEN o.scope ELSE t.scope END AS scope,
 t.operation_date,t.description,t.status,t.created_at,t.updated_at,t.deleted,t.debt_id
 FROM financial_transactions t LEFT JOIN financial_transactions o ON o.id=t.reversal_of;
