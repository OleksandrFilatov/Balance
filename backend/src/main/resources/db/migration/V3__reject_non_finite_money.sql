-- PostgreSQL numeric accepts NaN even with declared precision.
-- Reject it at the database boundary as well as in the Java BigDecimal model.
ALTER TABLE accounts ADD CONSTRAINT accounts_finite_initial_balance
    CHECK (initial_balance <> 'NaN'::numeric);
ALTER TABLE financial_transactions ADD CONSTRAINT transactions_finite_amount
    CHECK (amount <> 'NaN'::numeric);
