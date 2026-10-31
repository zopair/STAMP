PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 phone TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_codes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT NOT NULL,
 phone TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS otp_email_created ON otp_codes(email,created_at);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 github_repo TEXT,
 repo_url TEXT,
 web_url TEXT,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 plan TEXT NOT NULL CHECK(plan IN ('monthly','yearly','lifetime')),
 status TEXT NOT NULL DEFAULT 'pending',
 stripe_customer_id TEXT,
 stripe_subscription_id TEXT,
 current_period_end INTEGER,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 provider_event_id TEXT NOT NULL UNIQUE,
 amount INTEGER NOT NULL,
 currency TEXT NOT NULL,
 status TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 filename TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 recorded_at INTEGER NOT NULL,
 trusted_timestamp TEXT,
 github_commit TEXT,
 UNIQUE(user_id,sha256)
);
