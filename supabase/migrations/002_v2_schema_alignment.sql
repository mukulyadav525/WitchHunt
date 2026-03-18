-- RoadTwin India Schema Alignment v2.0
-- Syncs backend columns with frontend v2.0 types

-- 1. Complaints Table Enhancements
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Migration: Sync legacy photo_url to new image_url
UPDATE public.complaints SET image_url = photo_url WHERE image_url IS NULL AND photo_url IS NOT NULL;

-- 2. Utility Infrastructure Enhancements
ALTER TABLE public.utility_infrastructure
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_inspected TIMESTAMPTZ DEFAULT NOW();

-- Migration: Sync legacy last_inspection_date to new last_inspected
UPDATE public.utility_infrastructure SET last_inspected = last_inspection_date::timestamptz WHERE last_inspected IS NULL AND last_inspection_date IS NOT NULL;

-- 3. Ensure RLS for new columns (usually handled by table-level RLS, but good to check)
-- Existing policies on public.complaints and public.utility_infrastructure are already active.

-- 4. Utility Organizations Extensions (if any missing)
ALTER TABLE public.utility_organizations
  ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#00d4ff',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '⚡';
