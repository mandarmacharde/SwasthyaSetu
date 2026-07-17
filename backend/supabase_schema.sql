-- SwasthyaSetu Schema for Supabase
-- Run this in your Supabase Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PATIENTS
CREATE TABLE patients (
    id          BIGSERIAL PRIMARY KEY,
    phone       VARCHAR(20) NOT NULL DEFAULT '',
    name        VARCHAR(200) NOT NULL DEFAULT '',
    language    VARCHAR(10) NOT NULL DEFAULT 'mr',
    district    VARCHAR(100) NOT NULL DEFAULT '',
    abha_id     VARCHAR(20) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patients_phone ON patients(phone);

-- 2. HEALTH CENTERS
CREATE TABLE health_centers (
    id       BIGSERIAL PRIMARY KEY,
    name     VARCHAR(200) NOT NULL,
    district VARCHAR(100) NOT NULL,
    pincode  VARCHAR(10) NOT NULL DEFAULT '',
    phone    VARCHAR(20) NOT NULL DEFAULT ''
);

-- 3. USERS
CREATE TABLE users (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    phone            VARCHAR(20) NOT NULL,
    role             VARCHAR(20) NOT NULL,
    district         VARCHAR(100) NOT NULL DEFAULT '',
    health_center_id BIGINT REFERENCES health_centers(id),
    password_hash    VARCHAR(200) NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(phone)
);
CREATE INDEX idx_users_phone ON users(phone);

-- 4. CASES
CREATE TABLE cases (
    id                BIGSERIAL PRIMARY KEY,
    session_id        VARCHAR(20) NOT NULL,
    patient_id        BIGINT REFERENCES patients(id),
    assigned_to       BIGINT REFERENCES users(id),
    urgency           VARCHAR(20) NOT NULL DEFAULT 'medium',
    possible_category VARCHAR(100) NOT NULL DEFAULT '',
    transcript        TEXT NOT NULL DEFAULT '',
    triage_summary    TEXT NOT NULL DEFAULT '',
    status            VARCHAR(20) NOT NULL DEFAULT 'open',
    language          VARCHAR(10) NOT NULL DEFAULT 'mr',
    callback_number   VARCHAR(20) NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id)
);
CREATE INDEX idx_cases_patient_id ON cases(patient_id);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_session_id ON cases(session_id);

-- 5. Enable Row Level Security (open for anon key for now)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (demo purposes)
CREATE POLICY "Allow all on patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on health_centers" ON health_centers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cases" ON cases FOR ALL USING (true) WITH CHECK (true);
