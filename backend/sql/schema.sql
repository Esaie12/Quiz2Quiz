CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  pseudo TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  code VARCHAR(6) PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  mode TEXT NOT NULL DEFAULT 'battle',
  difficulty TEXT NOT NULL DEFAULT 'normal',
  duration_minutes INT NOT NULL DEFAULT 3,
  warrior_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
