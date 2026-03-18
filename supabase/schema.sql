-- ============================================================
-- ROADTWIN INDIA – MASTER SCHEMA (FINAL & COMPLETE)
-- ============================================================
-- Run this in Supabase SQL Editor FIRST.
-- This script resets EVERYTHING and disables RLS for a "just works" experience.
-- ============================================================

-- 0. CLEAN RESET
DROP TABLE IF EXISTS work_updates CASCADE;
DROP TABLE IF EXISTS permit_approvals CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS permits CASCADE;
DROP TABLE IF EXISTS utility_assets CASCADE;
DROP TABLE IF EXISTS road_health_scores CASCADE;
DROP TABLE IF EXISTS road_passports CASCADE;
DROP TABLE IF EXISTS road_segments CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. INFRASTRUCTURE TABLES
CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name) VALUES 
  ('super_admin'), ('municipal_engineer'), ('utility_dept'), ('field_supervisor'), ('citizen');

CREATE TABLE organizations (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,        -- PWD | Water | Gas | Electricity | Telecom | Admin
  city TEXT DEFAULT 'Indore',
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY, -- Links to auth.users.id
  name            TEXT NOT NULL,
  role_id         UUID REFERENCES roles(id),
  organization_id UUID REFERENCES organizations(id),
  phone           TEXT,
  language        TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GIS & ROAD ASSET TABLES
CREATE TABLE road_segments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_name    TEXT NOT NULL,
  road_code    TEXT UNIQUE,
  ward_id      TEXT,
  zone         TEXT,
  city         TEXT DEFAULT 'Indore',
  road_type    TEXT DEFAULT 'arterial',
  length_m     NUMERIC(10,2),
  width_m      NUMERIC(6,2),
  surface_type TEXT DEFAULT 'asphalt',
  geometry     GEOMETRY(LINESTRING,4326) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE road_passports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id      UUID REFERENCES road_segments(id) ON DELETE CASCADE UNIQUE,
  last_paved_date DATE,
  contractor_name TEXT,
  material        TEXT DEFAULT 'Bituminous',
  thickness_cm    NUMERIC(5,2),
  warranty_expiry DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE road_health_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id            UUID REFERENCES road_segments(id) ON DELETE CASCADE UNIQUE,
  score                 INTEGER CHECK (score >= 30 AND score <= 100),
  risk_level            TEXT, -- High | Medium | Low
  predicted_failure_date DATE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE utility_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID REFERENCES organizations(id),
  asset_type   TEXT NOT NULL, -- Water | Gas | Electric | Telecom
  material     TEXT,
  diameter_mm  INTEGER,
  depth_m      NUMERIC(5,2),
  geometry     GEOMETRY(LINESTRING,4326) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OPERATION TABLES
CREATE TABLE permits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_number    TEXT UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT,
  organization_id  UUID REFERENCES organizations(id) NOT NULL,
  road_segment_id  UUID REFERENCES road_segments(id),
  geometry         GEOMETRY(POLYGON,4326) NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  purpose          TEXT NOT NULL,
  status           TEXT DEFAULT 'pending', -- pending | approved | rejected | in_progress | completed
  emergency_flag   BOOLEAN DEFAULT FALSE,
  depth_m          NUMERIC(5,2),
  traffic_impact   TEXT,
  restoration_plan TEXT,
  created_by       UUID REFERENCES user_profiles(id),
  approved_by      UUID REFERENCES user_profiles(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permit_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id   UUID REFERENCES permits(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES user_profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id    UUID REFERENCES permits(id) ON DELETE CASCADE,
  update_type  TEXT DEFAULT 'status_update',
  message      TEXT,
  progress_pct INTEGER DEFAULT 0,
  photo_url    TEXT,
  created_by   UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT UNIQUE,
  complaint_type  TEXT DEFAULT 'pothole',
  description     TEXT NOT NULL,
  latitude        NUMERIC(10,7) NOT NULL,
  longitude       NUMERIC(10,7) NOT NULL,
  location_address TEXT,
  photo_url       TEXT,
  citizen_name    TEXT,
  citizen_phone   TEXT,
  citizen_email   TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERMISSIONS & SECURITY (One-Click Runnable Fix)
-- We DISABLE RLS because it causes "Database error querying schema" if permissions are restricted.
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE road_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE road_passports DISABLE ROW LEVEL SECURITY;
ALTER TABLE road_health_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE utility_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE permits      DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaints   DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles        DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE permit_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_updates DISABLE ROW LEVEL SECURITY;

-- Explicitly allow the web app to access everything
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Special fix for "Database error querying schema"
-- Sometimes PostgREST needs explicit usage on public schema.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;



-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION generate_permit_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.permit_number IS NULL THEN
    NEW.permit_number := 'PRM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_permit_number BEFORE INSERT ON permits FOR EACH ROW EXECUTE FUNCTION generate_permit_number();
