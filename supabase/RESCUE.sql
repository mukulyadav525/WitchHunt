-- ============================================================
-- ROADTWIN INDIA – MASTER V2.0 RECOVERY & INITIALIZATION
-- ============================================================
-- Use this script to completely reset and initialize the database 
-- to the state required by the v2.0 Frontend.
-- ============================================================

-- 0. CLEAN RESET (Drop old tables from both schema.sql and 001_initial_schema)
DROP TABLE IF EXISTS public.work_updates CASCADE;
DROP TABLE IF EXISTS public.permit_approvals CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.permits CASCADE;
DROP TABLE IF EXISTS public.excavation_permits CASCADE;
DROP TABLE IF EXISTS public.utility_assets CASCADE;
DROP TABLE IF EXISTS public.utility_infrastructure CASCADE;
DROP TABLE IF EXISTS public.utility_organizations CASCADE;
DROP TABLE IF EXISTS public.utility_conflict_zones CASCADE;
DROP TABLE IF EXISTS public.road_health_scores CASCADE;
DROP TABLE IF EXISTS public.health_predictions CASCADE;
DROP TABLE IF EXISTS public.road_image_surveys CASCADE;
DROP TABLE IF EXISTS public.road_passports CASCADE;
DROP TABLE IF EXISTS public.road_segments CASCADE;
DROP TABLE IF EXISTS public.defects CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE; -- from schema.sql
DROP TABLE IF EXISTS public.profiles CASCADE;      -- from 001_initial_schema
DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;
DROP TABLE IF EXISTS public.ai_configurations CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 0.1 Drop Types
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.defect_type CASCADE;
DROP TYPE IF EXISTS public.severity_level CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & TYPES
CREATE TYPE public.user_role AS ENUM ('admin', 'engineer', 'inspector', 'citizen');
CREATE TYPE public.defect_type AS ENUM ('pothole', 'crack', 'water_logging', 'surface_damage', 'edge_break', 'patching_failure', 'utility_cut');
CREATE TYPE public.severity_level AS ENUM ('1', '2', '3', '4', '5');

-- 3. CORE TABLES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role public.user_role DEFAULT 'citizen',
  department TEXT,
  phone TEXT,
  city TEXT DEFAULT 'Delhi',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.road_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  road_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  ward TEXT,
  zone TEXT,
  length_km DECIMAL(10,2),
  width_m DECIMAL(10,2),
  surface_type TEXT,
  last_paved_date DATE,
  avg_daily_traffic INT,
  heavy_vehicle_percentage INT,
  health_score INT DEFAULT 100,
  total_defects INT DEFAULT 0,
  last_health_update TIMESTAMPTZ,
  location JSONB, -- { lat, lng }
  geom GEOMETRY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ai_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model_provider TEXT DEFAULT 'anthropic',
  model_name TEXT NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.2,
  max_tokens INT DEFAULT 2000,
  parameters JSONB DEFAULT '{}',
  version INT DEFAULT 1,
  previous_prompts JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  test_result JSONB,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3.1 UTILITY & MUNICIPAL NODES
CREATE TABLE public.utility_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  portal_access_enabled BOOLEAN DEFAULT true,
  color_hex TEXT DEFAULT '#00d4ff',
  icon TEXT DEFAULT '⚡',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  road_segment_id UUID REFERENCES public.road_segments(id),
  defect_type public.defect_type NOT NULL,
  severity public.severity_level NOT NULL,
  confidence DECIMAL(5,4),
  source TEXT,
  status TEXT DEFAULT 'open',
  photo_url TEXT,
  location JSONB,
  geom GEOMETRY(POINT, 4326),
  area_sqm DECIMAL(10,2),
  description TEXT,
  ai_analysis JSONB,
  repair_priority TEXT,
  estimated_cost_inr DECIMAL(12,2),
  reported_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.health_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  road_segment_id UUID REFERENCES public.road_segments(id),
  health_score INT NOT NULL,
  predicted_failure_date DATE,
  months_remaining INT,
  risk_level TEXT,
  deterioration_rate DECIMAL(5,2),
  risk_factors JSONB DEFAULT '[]',
  recommendation TEXT,
  maintenance_schedule JSONB DEFAULT '[]',
  budget_estimate_inr DECIMAL(15,2),
  confidence DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.excavation_permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permit_number TEXT UNIQUE NOT NULL DEFAULT 'PERMIT-' || upper(substring(md5(random()::text), 1, 8)),
  organization TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  purpose TEXT,
  road_segment_id UUID REFERENCES public.road_segments(id),
  road_name TEXT,
  requested_start_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  depth_m DECIMAL(5,2),
  width_m DECIMAL(5,2),
  status TEXT DEFAULT 'pending',
  urgency TEXT DEFAULT 'normal',
  bundle_id UUID,
  ai_optimization JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL DEFAULT 'CMP-' || to_char(now(), 'YYYY') || '-' || upper(substring(md5(random()::text), 1, 6)),
  complaint_text TEXT NOT NULL,
  language TEXT,
  road_segment_id UUID REFERENCES public.road_segments(id),
  road_name TEXT,
  location JSONB,
  photo_url TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'open',
  urgency_score INT,
  defect_type TEXT,
  sentiment TEXT,
  citizen_name TEXT,
  citizen_phone TEXT,
  citizen_id UUID REFERENCES public.profiles(id),
  assigned_org_id UUID REFERENCES public.utility_organizations(id),
  priority TEXT DEFAULT 'medium',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  resolved_at TIMESTAMPTZ,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL,
  config_key TEXT,
  model_provider TEXT,
  model_name TEXT,
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  success BOOLEAN,
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.road_image_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  road_segment_id UUID REFERENCES public.road_segments(id),
  road_name TEXT,
  lat_center DECIMAL(10, 7) NOT NULL,
  lng_center DECIMAL(10, 7) NOT NULL,
  lat_min DECIMAL(10, 7),
  lat_max DECIMAL(10, 7),
  lng_min DECIMAL(10, 7),
  lng_max DECIMAL(10, 7),
  coverage_radius_meters INT DEFAULT 50,
  geom GEOMETRY(POINT, 4326),
  photo_url TEXT NOT NULL,
  photo_taken_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual_upload',
  ai_health_score DECIMAL(5,2),
  ai_condition TEXT,
  ai_defects JSONB DEFAULT '[]',
  ai_surface_properties JSONB,
  ai_weather_at_capture TEXT,
  ai_visibility_quality TEXT,
  ai_recommendations JSONB DEFAULT '[]',
  ai_confidence DECIMAL(5,4),
  ai_analyzed_at TIMESTAMPTZ,
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.utility_infrastructure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utility_org_id UUID REFERENCES public.utility_organizations(id),
  infra_type TEXT NOT NULL,
  utility_type TEXT NOT NULL,
  material TEXT,
  diameter_mm INT,
  voltage_kv DECIMAL(8,3),
  capacity TEXT,
  road_segment_id UUID REFERENCES public.road_segments(id),
  road_name TEXT,
  geom GEOMETRY(LINESTRING, 4326),
  start_location JSONB,
  end_location JSONB,
  length_meters DECIMAL(10,2),
  depth_min_meters DECIMAL(6,3),
  depth_max_meters DECIMAL(6,3),
  depth_avg_meters DECIMAL(6,3),
  installation_date DATE DEFAULT CURRENT_DATE,
  installation_year INT,
  expected_life_years INT,
  last_inspection_date DATE,
  last_inspected TIMESTAMPTZ DEFAULT NOW(),
  condition TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'active',
  safety_score INTEGER DEFAULT 100,
  spec_value TEXT,
  is_abandoned BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.utility_conflict_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  infra_id_1 UUID REFERENCES public.utility_infrastructure(id),
  infra_id_2 UUID REFERENCES public.utility_infrastructure(id),
  conflict_type TEXT,
  risk_level TEXT,
  location JSONB,
  geom GEOMETRY(POINT, 4326),
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS & PERMISSIONS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- 4. RLS POLICIES (Comprehensive Audit for v2.0)
DO $$ 
BEGIN
    ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.road_segments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.defects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.ai_configurations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.utility_infrastructure ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.complaints ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.road_image_surveys ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.health_predictions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.excavation_permits ENABLE ROW LEVEL SECURITY;
END $$;

-- Drop all existing policies to avoid conflicts
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4.1 Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4.2 Road Segments & Infrastructure
CREATE POLICY "Viewable by everyone" ON public.road_segments FOR SELECT USING (true);
CREATE POLICY "Viewable by everyone" ON public.utility_infrastructure FOR SELECT USING (true);
CREATE POLICY "Editors can manage roads" ON public.road_segments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Editors can manage utility" ON public.utility_infrastructure FOR ALL USING (auth.role() = 'authenticated');

-- 4.3 Defects & Surveys (CRITICAL FIX FOR ENGINEER ROLE)
CREATE POLICY "Viewable by everyone" ON public.defects FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage defects" ON public.defects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Viewable by everyone" ON public.road_image_surveys FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage surveys" ON public.road_image_surveys FOR ALL USING (auth.role() = 'authenticated');

-- 4.4 Complaints
CREATE POLICY "Viewable by everyone" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Public can insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can manage complaints" ON public.complaints FOR ALL USING (auth.role() = 'authenticated');

-- 4.5 AI Configurations & Predictions
CREATE POLICY "Viewable by authenticated" ON public.ai_configurations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage configs" ON public.ai_configurations FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Viewable by everyone" ON public.health_predictions FOR SELECT USING (true);
CREATE POLICY "Authenticated manage predictions" ON public.health_predictions FOR ALL USING (auth.role() = 'authenticated');

-- 4.6 Permits
CREATE POLICY "Viewable by everyone" ON public.excavation_permits FOR SELECT USING (true);
CREATE POLICY "Authenticated manage permits" ON public.excavation_permits FOR ALL USING (auth.role() = 'authenticated');

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, city)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'citizen',
    'Mumbai'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION set_survey_geom() RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng_center, NEW.lat_center), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_set_geom BEFORE INSERT OR UPDATE ON public.road_image_surveys FOR EACH ROW EXECUTE FUNCTION set_survey_geom();

-- 6. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 7. SYNC EXISTING USERS
INSERT INTO public.profiles (id, email, full_name, role, city)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email),
  'citizen',
  'Mumbai'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 8. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('road-images', 'road-images', true),
  ('defect-photos', 'defect-photos', true),
  ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Clean reset for storage)
DROP POLICY IF EXISTS "Public View" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

CREATE POLICY "Public View" ON storage.objects FOR SELECT USING (bucket_id IN ('road-images', 'defect-photos', 'complaint-photos'));
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('road-images', 'defect-photos', 'complaint-photos'));

-- 9. SEED DATA (National Capital Territory - Delhi v3.0 Enterprise)
-- 9.1 Road Segments (15 Strategic Corridors)
INSERT INTO public.road_segments (road_id, name, city, ward, zone, length_km, width_m, surface_type, health_score, total_defects, location) VALUES
('RS-DEL-001', 'Connaught Place (Inner Circle)', 'Delhi', 'NDMC', 'Central', 1.2, 18.0, 'bitumen', 95, 1, '{"lat": 28.6330, "lng": 77.2194}'),
('RS-DEL-002', 'Ring Road (AIIMS-Sarojini)', 'Delhi', 'South', 'South', 3.5, 30.0, 'bitumen', 62, 8, '{"lat": 28.5670, "lng": 77.2100}'),
('RS-DEL-003', 'Chanakyapuri (Shanti Path)', 'Delhi', 'NDMC', 'South-West', 2.8, 40.0, 'bitumen', 98, 0, '{"lat": 28.5950, "lng": 77.1850}'),
('RS-DEL-004', 'Dhaula Kuan Flyover', 'Delhi', 'Cantonment', 'West', 1.5, 25.0, 'concrete', 85, 2, '{"lat": 28.5910, "lng": 77.1610}'),
('RS-DEL-005', 'Chandni Chowk Main Road', 'Delhi', 'Civil Lines', 'North', 0.9, 8.0, 'interlocking_blocks', 45, 18, '{"lat": 28.6506, "lng": 77.2304}'),
('RS-DEL-006', 'Nelson Mandela Marg', 'Delhi', 'Vasant Kunj', 'South', 4.1, 20.0, 'bitumen', 72, 5, '{"lat": 28.5440, "lng": 77.1550}'),
('RS-DEL-007', 'Outer Ring Road (Nehru Place)', 'Delhi', 'South-East', 'South', 5.2, 35.0, 'bitumen', 55, 12, '{"lat": 28.5490, "lng": 77.2520}'),
('RS-DEL-008', 'Lodhi Road', 'Delhi', 'NDMC', 'Central', 2.1, 15.0, 'bitumen', 88, 3, '{"lat": 28.5870, "lng": 77.2250}'),
('RS-DEL-009', 'Mathura Road (Nizamuddin)', 'Delhi', 'South-East', 'South', 6.8, 28.0, 'bitumen', 40, 25, '{"lat": 28.5900, "lng": 77.2450}'),
('RS-DEL-010', 'Janpath', 'Delhi', 'NDMC', 'Central', 1.4, 12.0, 'bitumen', 90, 2, '{"lat": 28.6250, "lng": 77.2200}'),
('RS-DEL-011', 'Vikas Marg (Laxmi Nagar)', 'Delhi', 'East', 'East', 3.8, 22.0, 'bitumen', 50, 15, '{"lat": 28.6380, "lng": 77.2750}'),
('RS-DEL-012', 'Pusa Road (Karol Bagh)', 'Delhi', 'Central', 'Central', 2.5, 20.0, 'concrete', 68, 7, '{"lat": 28.6450, "lng": 77.1900}'),
('RS-DEL-013', 'Aurobindo Marg (Hauz Khas)', 'Delhi', 'South', 'South', 4.5, 24.0, 'bitumen', 75, 4, '{"lat": 28.5450, "lng": 77.2000}'),
('RS-DEL-014', 'Rohtak Road (Punjabi Bagh)', 'Delhi', 'West', 'West', 5.0, 26.0, 'bitumen', 58, 9, '{"lat": 28.6700, "lng": 77.1300}'),
('RS-DEL-015', 'GT Road (Azadpur)', 'Delhi', 'North', 'North', 6.2, 28.0, 'concrete', 65, 11, '{"lat": 28.7150, "lng": 77.1850}')
ON CONFLICT (road_id) DO UPDATE SET health_score = EXCLUDED.health_score;

-- 9.2 Utility Organizations (Stakeholder Matrix)
INSERT INTO public.utility_organizations (code, name, type, color_hex, icon) VALUES
('IGL', 'Indraprastha Gas Limited', 'gas', '#ff6b35', '🔥'),
('BSES-R', 'BSES Rajdhani Power', 'electricity', '#ffd700', '⚡'),
('BSES-Y', 'BSES Yamuna Power', 'electricity', '#ffcc00', '⚡'),
('TATA-P', 'Tata Power DDL', 'electricity', '#ff9900', '⚡'),
('DJB', 'Delhi Jal Board', 'water', '#3b82f6', '💧'),
('NDMC-S', 'NDMC Sewerage Dept', 'sewage', '#8b5cf6', '🚰'),
('MTNL', 'MTNL Delhi', 'telecom', '#00d4ff', '📡'),
('AERTL', 'Airtel Fiber Delhi', 'telecom', '#e11d48', '📡'),
('JIO', 'Reliance Jio Fiber', 'telecom', '#0056b3', '📡')
ON CONFLICT (code) DO NOTHING;

-- 9.3 Utility Infrastructure (Lifecycle Asset Grid)
INSERT INTO public.utility_infrastructure (utility_org_id, road_name, infra_type, utility_type, status, depth_avg_meters, material, installation_date, safety_score, condition, start_location, end_location)
SELECT uo.id, rs.name, 'pipeline', uo.type, 'active', 1.4, 
  CASE WHEN uo.type = 'gas' THEN 'Steel' WHEN uo.type = 'water' THEN 'DI' ELSE 'PVC' END,
  '2018-05-15'::date, 95, 'good',
  jsonb_build_object('lat', (rs.location->>'lat')::decimal + 0.0005, 'lng', (rs.location->>'lng')::decimal + 0.0005),
  jsonb_build_object('lat', (rs.location->>'lat')::decimal - 0.0005, 'lng', (rs.location->>'lng')::decimal - 0.0005)
FROM public.utility_organizations uo
CROSS JOIN public.road_segments rs
WHERE (uo.code = 'IGL' AND rs.road_id = 'RS-DEL-001') OR (uo.code = 'DJB' AND rs.road_id = 'RS-DEL-001')
   OR (uo.code = 'BSES-R' AND rs.road_id = 'RS-DEL-002') OR (uo.code = 'MTNL' AND rs.road_id = 'RS-DEL-002')
   OR (uo.code = 'IGL' AND rs.road_id = 'RS-DEL-003') OR (uo.code = 'TATA-P' AND rs.road_id = 'RS-DEL-003')
   OR (uo.code = 'DJB' AND rs.road_id = 'RS-DEL-005') OR (uo.code = 'JIO' AND rs.road_id = 'RS-DEL-005')
   OR (uo.code = 'NDMC-S' AND rs.road_id = 'RS-DEL-008') OR (uo.code = 'AERTL' AND rs.road_id = 'RS-DEL-008')
   OR (uo.code = 'IGL' AND rs.road_id = 'RS-DEL-010') OR (uo.code = 'BSES-Y' AND rs.road_id = 'RS-DEL-011');

-- 9.4 Defects (Delhi Surface Anomalies)
INSERT INTO public.defects (road_segment_id, defect_type, severity, confidence, source, status, description, area_sqm, repair_priority, estimated_cost_inr)
SELECT id, 'pothole', '5', 0.98, 'ai_detection', 'open', 'Large pothole near CP Inner Circle', 2.5, 'immediate', 8500 FROM public.road_segments WHERE road_id = 'RS-DEL-001';
INSERT INTO public.defects (road_segment_id, defect_type, severity, confidence, source, status, description, area_sqm, repair_priority, estimated_cost_inr)
SELECT id, 'crack', '3', 0.85, 'manual_report', 'open', 'Longitudinal cracks on Ring Road', 12.0, 'within_month', 45000 FROM public.road_segments WHERE road_id = 'RS-DEL-002';
INSERT INTO public.defects (road_segment_id, defect_type, severity, confidence, source, status, description, area_sqm, repair_priority, estimated_cost_inr)
SELECT id, 'pothole', '4', 0.92, 'ai_detection', 'open', 'Multiple potholes cluster', 3.8, 'high', 15000 FROM public.road_segments WHERE road_id IN ('RS-DEL-005', 'RS-DEL-011', 'RS-DEL-014', 'RS-DEL-015') LIMIT 10;

-- 9.5 Complaints (Collaborative Intelligence Feed)
INSERT INTO public.complaints (complaint_text, road_name, status, urgency_score, defect_type, sentiment, citizen_name, assigned_org_id)
SELECT 'Road sunken near AIIMS metro, gas leak suspected.', 'Ring Road (AIIMS-Sarojini)', 'open', 5, 'surface_damage', 'critical', 'Sandeep Tyagi', (SELECT id FROM public.utility_organizations WHERE code = 'IGL');
INSERT INTO public.complaints (complaint_text, road_name, status, urgency_score, defect_type, sentiment, citizen_name, assigned_org_id)
SELECT 'Major water logging at Chandni Chowk.', 'Chandni Chowk Main Road', 'open', 4, 'water_logging', 'angry', 'Mohd. Zaid', (SELECT id FROM public.utility_organizations WHERE code = 'DJB');

-- 9.6 Excavation Permits (Delhi Registry)
INSERT INTO public.excavation_permits (organization, contact_name, purpose, road_name, requested_start_date, requested_end_date, status, urgency) VALUES
('IGL', 'Mr. Dixit', 'Gas pipeline maintenance', 'Connaught Place (Inner Circle)', '2026-05-01', '2026-05-15', 'approved', 'normal'),
('BSES-R', 'Anuj S.', 'Cable replacement', 'Lodhi Road', '2026-05-05', '2026-05-07', 'pending', 'urgent'),
('DJB', 'B.S. Rawat', 'New sewage line installation', 'Janpath', '2026-05-10', '2026-06-10', 'active', 'normal');

-- 9.7 AI Configurations (Delhi Digital Twin Brain)
INSERT INTO public.ai_configurations (config_key, module, display_name, description, system_prompt, model_name) VALUES
('digging_advisor', 'excavation', 'DigSafe AI', 'Analyzes infrastructure depth and material for safe excavation planning', 'You are a safety engineer for NCT Delhi...', 'gemini-2.0-flash')
ON CONFLICT (config_key) DO NOTHING;