CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_wallets_user_currency UNIQUE (username, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_username ON wallets(username);
CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON wallets(account_number);
