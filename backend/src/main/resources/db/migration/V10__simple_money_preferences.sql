-- Preferences never merge or rename existing accounts.
CREATE TABLE owner_money_settings(id boolean PRIMARY KEY CHECK(id),default_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT);
INSERT INTO owner_money_settings(id) VALUES (true);
ALTER TABLE financial_transactions DROP CONSTRAINT financial_transactions_type_check;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_type_check CHECK(type IN ('INCOME','EXPENSE','TRANSFER','LOAN_RECEIPT','DEBT_PRINCIPAL','REVERSAL','OPENING_ADJUSTMENT'));
DO $$ DECLARE old_shape text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO old_shape FROM pg_constraint WHERE conrelid='financial_transactions'::regclass AND conname='transaction_shape';
 ALTER TABLE financial_transactions DROP CONSTRAINT transaction_shape;
 EXECUTE 'ALTER TABLE financial_transactions ADD CONSTRAINT transaction_shape CHECK ((' || old_shape || ') OR '
 || '(type=''OPENING_ADJUSTMENT'' AND ((debit_account_id IS NULL AND credit_account_id IS NOT NULL) OR (debit_account_id IS NOT NULL AND credit_account_id IS NULL)) '
 || 'AND category_id IS NULL AND scope IS NULL AND debt_id IS NULL AND recurring_id IS NULL AND reversal_of IS NULL AND status=''CONFIRMED''))';
END $$;
INSERT INTO categories(id,name,type) SELECT '00000000-0000-0000-0004-000000000001'::uuid,'Вода','EXPENSE' WHERE NOT EXISTS(SELECT 1 FROM categories WHERE type='EXPENSE' AND lower(btrim(name))=lower('Вода'));
INSERT INTO categories(id,name,type) SELECT '00000000-0000-0000-0004-000000000002'::uuid,'Подписки','EXPENSE' WHERE NOT EXISTS(SELECT 1 FROM categories WHERE type='EXPENSE' AND lower(btrim(name))=lower('Подписки'));
