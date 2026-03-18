-- RoadTwin India Master Schema v2.0
-- Gap-Filled · PostGIS Enabled · RLS Secured

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Profiles Table
CREATE TYPE public.user_role AS ENUM ('admin', 'engineer', 'inspector', 'citizen');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role public.user_role DEFAULT 'citizen',
  department TEXT,
  phone TEXT,
  city TEXT DEFAULT 'Mumbai',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gap 2: Auto-create profile row when user signs up
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

-- 2. Road Network
CREATE TABLE public.road_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  road_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  ward TEXT,
  zone TEXT,
  length_km DECIMAL(10,2),
  width_m DECIMAL(10,2),
  surface_type TEXT, -- bitumen, concrete, etc.
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

-- 3. AI Configuration
CREATE TABLE public.ai_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model_provider TEXT DEFAULT 'google',
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

-- 4. Defects
CREATE TYPE public.defect_type AS ENUM ('pothole', 'crack', 'water_logging', 'surface_damage', 'edge_break', 'patching_failure', 'utility_cut');
CREATE TYPE public.severity_level AS ENUM ('1', '2', '3', '4', '5');

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

-- 5. Health Predictions
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

-- 6. Excavation Permits
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

-- 7. Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL DEFAULT 'CMP-' || to_char(now(), 'YYYY') || '-' || upper(substring(md5(random()::text), 1, 6)),
  complaint_text TEXT NOT NULL,
  language TEXT,
  road_segment_id UUID REFERENCES public.road_segments(id),
  road_name TEXT,
  location JSONB,
  photo_url TEXT,
  status TEXT DEFAULT 'open',
  urgency_score INT,
  defect_type TEXT,
  sentiment TEXT,
  keywords TEXT[],
  response_time_hours INT,
  population_impact INT,
  ai_analysis JSONB,
  citizen_name TEXT,
  citizen_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Usage Logs
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

-- Feature 1: Road Survey Table
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

-- Feature 2: Utility Infrastructure
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
  installation_year INT,
  expected_life_years INT,
  last_inspection_date DATE,
  condition TEXT DEFAULT 'unknown',
  corrosion_risk TEXT DEFAULT 'unknown',
  drawing_url TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  uploaded_by UUID REFERENCES public.profiles(id),
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

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_infrastructure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Roads are viewable by everyone" ON public.road_segments FOR SELECT USING (true);
CREATE POLICY "Defects are viewable by everyone" ON public.defects FOR SELECT USING (true);
CREATE POLICY "Admin can edit road segments" ON public.road_segments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Triggers for PostGIS
CREATE OR REPLACE FUNCTION set_survey_geom() RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng_center, NEW.lat_center), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_set_geom BEFORE INSERT OR UPDATE ON public.road_image_surveys FOR EACH ROW EXECUTE FUNCTION set_survey_geom();

CREATE OR REPLACE FUNCTION detect_utility_conflicts(new_infra_id UUID) RETURNS void AS $$
DECLARE
  new_infra public.utility_infrastructure%ROWTYPE;
  conflict RECORD;
BEGIN
  SELECT * INTO new_infra FROM public.utility_infrastructure WHERE id = new_infra_id;
  FOR conflict IN
    SELECT ui.id, ui.utility_type, ui.depth_avg_meters,
      ABS(ui.depth_avg_meters - new_infra.depth_avg_meters) as depth_diff
    FROM public.utility_infrastructure ui
    WHERE ui.id != new_infra_id
      AND ui.road_name ILIKE '%' || new_infra.road_name || '%'
      AND ui.is_active = true
      AND ABS(ui.depth_avg_meters - new_infra.depth_avg_meters) < 0.5
  LOOP
    INSERT INTO public.utility_conflict_zones (infra_id_1, infra_id_2, conflict_type, risk_level, notes)
    VALUES (new_infra_id, conflict.id, 'depth_overlap',
      CASE WHEN conflict.depth_diff < 0.2 THEN 'high' WHEN conflict.depth_diff < 0.35 THEN 'medium' ELSE 'low' END,
      format('%s and %s within %sm depth on %s', new_infra.utility_type, conflict.utility_type, ROUND(conflict.depth_diff::numeric, 2), new_infra.road_name)
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_conflict_detection() RETURNS TRIGGER AS $$
BEGIN PERFORM detect_utility_conflicts(NEW.id); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_utility_insert AFTER INSERT ON public.utility_infrastructure FOR EACH ROW EXECUTE FUNCTION trigger_conflict_detection();
