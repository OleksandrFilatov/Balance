CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
    type varchar(20) NOT NULL CHECK (type IN ('BANK','CASH','SAVINGS')),
    currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    initial_balance numeric(19,2) NOT NULL,
    created_at timestamptz NOT NULL,
    active boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (id, currency)
);

CREATE TABLE categories (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
    type varchar(20) NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
    active boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (id, type)
);
CREATE UNIQUE INDEX categories_active_name_type_idx ON categories (type, lower(btrim(name))) WHERE active;

-- One row represents one complete movement, including both legs of a transfer.
-- Soft deletion preserves the idempotency key so retries cannot recreate a deleted movement.
CREATE TABLE financial_transactions (
    id uuid PRIMARY KEY,
    type varchar(20) NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
    amount numeric(19,2) NOT NULL CHECK (amount > 0),
    currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    debit_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
    credit_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
    scope varchar(20) CHECK (scope IN ('PERSONAL','HOUSEHOLD')),
    operation_date date NOT NULL CHECK (operation_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
    description varchar(2000) NOT NULL DEFAULT '',
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','CONFIRMED')),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL CHECK (updated_at >= created_at),
    deleted boolean NOT NULL DEFAULT false,
    create_key uuid NOT NULL UNIQUE,
    create_fingerprint varchar(64) NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (debit_account_id, currency) REFERENCES accounts(id, currency) ON DELETE RESTRICT,
    FOREIGN KEY (credit_account_id, currency) REFERENCES accounts(id, currency) ON DELETE RESTRICT,
    FOREIGN KEY (category_id, type) REFERENCES categories(id, type) ON DELETE RESTRICT,
    CONSTRAINT transaction_shape CHECK (
        (type = 'INCOME' AND debit_account_id IS NULL AND credit_account_id IS NOT NULL AND category_id IS NOT NULL AND scope IS NOT NULL)
        OR (type = 'EXPENSE' AND debit_account_id IS NOT NULL AND credit_account_id IS NULL AND category_id IS NOT NULL AND scope IS NOT NULL)
        OR (type = 'TRANSFER' AND debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL
            AND debit_account_id <> credit_account_id AND category_id IS NULL AND scope IS NULL)
    )
);
CREATE INDEX transactions_date_idx ON financial_transactions (operation_date DESC, created_at DESC, id DESC) WHERE NOT deleted;
CREATE INDEX transactions_debit_date_idx ON financial_transactions (debit_account_id, operation_date) WHERE NOT deleted;
CREATE INDEX transactions_credit_date_idx ON financial_transactions (credit_account_id, operation_date) WHERE NOT deleted;
CREATE INDEX transactions_category_date_idx ON financial_transactions (category_id, operation_date) WHERE NOT deleted;
CREATE INDEX transactions_scope_date_idx ON financial_transactions (scope, operation_date) WHERE NOT deleted;
CREATE INDEX transactions_summary_idx ON financial_transactions (currency, operation_date) WHERE NOT deleted AND status = 'CONFIRMED';
