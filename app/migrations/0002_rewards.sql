-- Demo Rewards: no face recognition, no biometric records, no actual checkout.
CREATE TABLE IF NOT EXISTS rewards_customers (
 id TEXT PRIMARY KEY, first_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 favorite_product TEXT NOT NULL DEFAULT '', marketing_opt_in INTEGER NOT NULL DEFAULT 0,
 session_hash TEXT NOT NULL UNIQUE, coupon_code TEXT NOT NULL UNIQUE,
 coupon_redeemed_at TEXT, redeemed_product TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
 visit_count INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS rewards_customer_session_idx ON rewards_customers(session_hash);
