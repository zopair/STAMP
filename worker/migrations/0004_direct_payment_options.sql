CREATE TABLE IF NOT EXISTS payment_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 merchant_trade_no TEXT NOT NULL UNIQUE,
 plan TEXT NOT NULL CHECK(plan IN ('monthly','yearly','lifetime')),
 method TEXT NOT NULL CHECK(method IN ('binance','instapay')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
 currency TEXT NOT NULL CHECK(currency IN ('USDT','EGP')),
 usd_amount_cents INTEGER NOT NULL CHECK(usd_amount_cents > 0),
 exchange_rate INTEGER NOT NULL DEFAULT 55 CHECK(exchange_rate = 55),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','paid','rejected','expired')),
 provider_order_id TEXT,
 checkout_url TEXT,
 transfer_reference TEXT,
 provider_transaction_id TEXT UNIQUE,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS payment_orders_user_created ON payment_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_status_method ON payment_orders(status,method);
ALTER TABLE subscriptions ADD COLUMN payment_order_id TEXT REFERENCES payment_orders(id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payment_order_unique ON subscriptions(payment_order_id);
