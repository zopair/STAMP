CREATE TABLE IF NOT EXISTS otp_rate_limits (
 scope TEXT NOT NULL CHECK(scope IN ('email','phone','ip')),
 subject_hash TEXT NOT NULL,
 window_start INTEGER NOT NULL,
 request_count INTEGER NOT NULL CHECK(request_count > 0),
 PRIMARY KEY(scope,subject_hash)
);
