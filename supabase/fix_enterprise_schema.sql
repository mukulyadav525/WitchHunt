-- v3.0 ENTERPRISE SCHEMA UPGRADE MIGRATION
-- Use this to fix the database if you encounter "column does not exist" errors during seeding.

-- 1. Upgrade utility_infrastructure
ALTER TABLE public.utility_infrastructure 
ADD COLUMN IF NOT EXISTS installation_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS spec_value TEXT,
ADD COLUMN IF NOT EXISTS is_abandoned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safety_score INTEGER DEFAULT 100;

-- Ensure material column exists (it's in RESCUE.sql but just in case)
ALTER TABLE public.utility_infrastructure 
ADD COLUMN IF NOT EXISTS material TEXT;

-- 2. Upgrade complaints
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS assigned_org_id UUID REFERENCES public.utility_organizations(id),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 3. Cleanup redundant or missing columns mentioned in seed
ALTER TABLE public.road_segments
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Delhi',
ADD COLUMN IF NOT EXISTS ward TEXT,
ADD COLUMN IF NOT EXISTS zone TEXT;

-- 4. Infrastructure Type column for clarity
ALTER TABLE public.utility_infrastructure
ADD COLUMN IF NOT EXISTS infra_type TEXT DEFAULT 'pipeline';
