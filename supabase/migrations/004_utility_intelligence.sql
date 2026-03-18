-- ============================================================
-- MIGRATION: 004_utility_intelligence
-- Expand utility infrastructure, risk assessment, and conflict tracking
-- ============================================================

-- 0. ALIGN EXISTING SCHEMA WITH NEW REQUIREMENTS
-- Rename depth columns from _meters to _m
ALTER TABLE public.utility_infrastructure RENAME COLUMN depth_min_meters TO depth_min_m;
ALTER TABLE public.utility_infrastructure RENAME COLUMN depth_max_meters TO depth_max_m;
ALTER TABLE public.utility_infrastructure RENAME COLUMN depth_avg_meters TO depth_avg_m;

-- Add installation_date if it doesn't exist (it was installation_year before)
ALTER TABLE public.utility_infrastructure ADD COLUMN IF NOT EXISTS installation_date DATE;
-- Migrate year to date if possible (e.g. Jan 1st of that year)
UPDATE public.utility_infrastructure 
SET installation_date = (installation_year || '-01-01')::DATE 
WHERE installation_year IS NOT NULL AND installation_date IS NULL;

-- 1. Add missing columns to existing utility_infrastructure table
ALTER TABLE public.utility_infrastructure
  ADD COLUMN IF NOT EXISTS asset_code         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS asset_subtype      TEXT,
  ADD COLUMN IF NOT EXISTS area_name          TEXT,
  ADD COLUMN IF NOT EXISTS address_from       TEXT,
  ADD COLUMN IF NOT EXISTS address_to         TEXT,
  ADD COLUMN IF NOT EXISTS outer_diameter_mm  INT,
  ADD COLUMN IF NOT EXISTS pressure_rating    TEXT,
  -- voltage_kv ALREADY EXISTS in 001_initial_schema.sql but adding IF NOT EXISTS is safe
  -- capacity ALREADY EXISTS as TEXT, new plan might want capacity_description
  ADD COLUMN IF NOT EXISTS capacity_description TEXT,
  ADD COLUMN IF NOT EXISTS design_life_years  INT,
  -- last_inspection_date ALREADY EXISTS
  ADD COLUMN IF NOT EXISTS last_repair_date   DATE,
  ADD COLUMN IF NOT EXISTS next_inspection_due DATE,
  ADD COLUMN IF NOT EXISTS condition_score    INT CHECK (condition_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS risk_level         TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS risk_score         DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS repair_count       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failure_date  DATE,
  ADD COLUMN IF NOT EXISTS is_critical_infra  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_high_pressure   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS survey_method      TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS accuracy_class     TEXT DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS photo_urls         TEXT[],
  -- drawing_url ALREADY EXISTS
  ADD COLUMN IF NOT EXISTS tags               TEXT[],
  ADD COLUMN IF NOT EXISTS custom_properties  JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_system      TEXT,
  ADD COLUMN IF NOT EXISTS external_id        TEXT;

-- 2. Add spatial indexes if not present
CREATE INDEX IF NOT EXISTS idx_utility_geom_gist
  ON public.utility_infrastructure USING GIST(geom);

CREATE INDEX IF NOT EXISTS idx_utility_risk
  ON public.utility_infrastructure(risk_level);

CREATE INDEX IF NOT EXISTS idx_utility_condition
  ON public.utility_infrastructure(condition_score);

-- 3. NEW TABLE: Utility nodes (valves, joints, manholes)
CREATE TABLE IF NOT EXISTS public.utility_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id      UUID REFERENCES public.utility_infrastructure(id) ON DELETE CASCADE,
  utility_org_id UUID REFERENCES public.utility_organizations(id),
  node_type     TEXT NOT NULL,  -- 'valve','junction','hydrant','manhole','chamber','meter','joint'
  utility_type  TEXT NOT NULL,
  geom          GEOMETRY(POINT, 4326) NOT NULL,
  depth_m       DECIMAL(6,3),
  elevation_m   DECIMAL(8,3),
  description   TEXT,
  status        TEXT DEFAULT 'active',
  photo_url     TEXT,
  is_accessible BOOLEAN DEFAULT true,
  last_operated DATE,
  notes         TEXT,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nodes_geom  ON public.utility_nodes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_nodes_asset ON public.utility_nodes(asset_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type  ON public.utility_nodes(node_type);

-- 4. NEW TABLE: Asset maintenance history
CREATE TABLE IF NOT EXISTS public.asset_maintenance_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        UUID REFERENCES public.utility_infrastructure(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,  -- 'inspection','repair','replacement','emergency'
  performed_date  DATE NOT NULL,
  performed_by    TEXT,
  org_id          UUID REFERENCES public.utility_organizations(id),
  description     TEXT,
  cost_inr        INT,
  before_condition INT,
  after_condition  INT,
  photo_urls      TEXT[],
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_asset ON public.asset_maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_maint_date  ON public.asset_maintenance_history(performed_date);

-- 5. NEW TABLE: Utility risk assessments (AI-generated)
CREATE TABLE IF NOT EXISTS public.utility_risk_assessments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id                UUID REFERENCES public.utility_infrastructure(id) ON DELETE CASCADE,
  assessed_at             TIMESTAMPTZ DEFAULT NOW(),
  risk_level              TEXT NOT NULL,
  risk_score              DECIMAL(5,2),
  failure_probability_12m DECIMAL(5,4),
  predicted_failure_date  DATE,
  risk_factors            JSONB,
  recommendations         JSONB,
  urgency_notes           TEXT,
  ai_model_version        TEXT,
  confidence              DECIMAL(5,4),
  raw_ai_response         JSONB,
  created_by              UUID REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_urisk_asset   ON public.utility_risk_assessments(asset_id);
CREATE INDEX IF NOT EXISTS idx_urisk_level   ON public.utility_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_urisk_failure ON public.utility_risk_assessments(predicted_failure_date);

-- 6. NEW TABLE: Excavation conflicts (AI-detected)
CREATE TABLE IF NOT EXISTS public.excavation_conflicts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  excavation_id      UUID REFERENCES public.excavation_permits(id) ON DELETE CASCADE,
  asset_id           UUID REFERENCES public.utility_infrastructure(id) ON DELETE CASCADE,
  org_id             UUID REFERENCES public.utility_organizations(id),
  severity           TEXT NOT NULL,  -- 'critical','high','medium','low','info'
  conflict_type      TEXT NOT NULL,  -- 'direct_hit','proximity_risk','depth_overlap','parallel_close'
  distance_m         DECIMAL(8,3),
  depth_difference_m DECIMAL(6,3),
  description        TEXT,
  ai_explanation     TEXT,
  recommended_action TEXT,
  is_resolved        BOOLEAN DEFAULT false,
  resolved_by        UUID REFERENCES public.profiles(id),
  resolved_at        TIMESTAMPTZ,
  resolution_notes   TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conflicts_excav ON public.excavation_conflicts(excavation_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_asset ON public.excavation_conflicts(asset_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_sev   ON public.excavation_conflicts(severity);

-- 7. NEW TABLE: Department notifications
CREATE TABLE IF NOT EXISTS public.utility_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_type TEXT NOT NULL,  -- 'excavation_nearby','conflict_detected','risk_alert','maintenance_due'
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  severity          TEXT NOT NULL,
  source_id         UUID,           -- excavation_id or asset_id
  source_type       TEXT,           -- 'excavation' or 'asset'
  target_org_id     UUID REFERENCES public.utility_organizations(id),
  target_user_id    UUID REFERENCES public.profiles(id),
  city              TEXT,
  location          JSONB,
  is_read           BOOLEAN DEFAULT false,
  is_actioned       BOOLEAN DEFAULT false,
  actioned_by       UUID REFERENCES public.profiles(id),
  actioned_at       TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unotif_org   ON public.utility_notifications(target_org_id, is_read);
CREATE INDEX IF NOT EXISTS idx_unotif_user  ON public.utility_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_unotif_type  ON public.utility_notifications(notification_type);

-- 8. SPATIAL FUNCTIONS for conflict detection

-- Find all utility assets within N meters of a polygon
CREATE OR REPLACE FUNCTION get_assets_near_zone(
  zone_geom GEOMETRY,
  buffer_meters FLOAT DEFAULT 50
)
RETURNS TABLE (
  asset_id UUID, org_id UUID, utility_type TEXT,
  road_name TEXT, depth_avg_m DECIMAL, material TEXT,
  status TEXT, risk_level TEXT, is_critical_infra BOOLEAN,
  is_high_pressure BOOLEAN, distance_m FLOAT,
  condition_score INT, org_name TEXT, org_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.id, ui.utility_org_id, ui.utility_type,
    ui.road_name, ui.depth_avg_m, ui.material,
    ui.status::TEXT, ui.risk_level,
    COALESCE(ui.is_critical_infra, false),
    COALESCE(ui.is_high_pressure, false),
    ST_Distance(ui.geom::geography, zone_geom::geography)::FLOAT,
    ui.condition_score,
    uo.name, uo.color_hex
  FROM public.utility_infrastructure ui
  JOIN public.utility_organizations uo ON uo.id = ui.utility_org_id
  WHERE ST_DWithin(ui.geom::geography, zone_geom::geography, buffer_meters)
    AND ui.status != 'decommissioned'
  ORDER BY ST_Distance(ui.geom::geography, zone_geom::geography) ASC;
END;
$$ LANGUAGE plpgsql;

-- Cross-section: all utilities on a road ordered by depth
CREATE OR REPLACE FUNCTION get_road_cross_section(road_name_input TEXT)
RETURNS TABLE (
  asset_id UUID, org_code TEXT, org_name TEXT, color_hex TEXT,
  utility_type TEXT, material TEXT, diameter_mm INT,
  depth_avg_m DECIMAL, depth_min_m DECIMAL, depth_max_m DECIMAL,
  status TEXT, condition_score INT, installation_year INT,
  risk_level TEXT, is_critical_infra BOOLEAN, is_high_pressure BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.id, uo.code, uo.name, uo.color_hex,
    ui.utility_type, ui.material, ui.diameter_mm,
    ui.depth_avg_m, ui.depth_min_m, ui.depth_max_m,
    ui.status::TEXT, ui.condition_score,
    EXTRACT(YEAR FROM ui.installation_date)::INT,
    ui.risk_level,
    COALESCE(ui.is_critical_infra, false),
    COALESCE(ui.is_high_pressure, false)
  FROM public.utility_infrastructure ui
  JOIN public.utility_organizations uo ON uo.id = ui.utility_org_id
  WHERE ui.road_name ILIKE '%' || road_name_input || '%'
    AND ui.status != 'decommissioned'
  ORDER BY ui.depth_avg_m ASC;
END;
$$ LANGUAGE plpgsql;

-- RLS for new tables
ALTER TABLE public.utility_nodes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_risk_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excavation_conflicts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_notifications      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes_select_all"    ON public.utility_nodes              FOR SELECT USING (true);
CREATE POLICY "nodes_insert"        ON public.utility_nodes              FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "maint_select_all"    ON public.asset_maintenance_history  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "maint_insert"        ON public.asset_maintenance_history  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "urisk_select"        ON public.utility_risk_assessments   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "urisk_insert"        ON public.utility_risk_assessments   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conflicts_select"    ON public.excavation_conflicts        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "conflicts_insert"    ON public.excavation_conflicts        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "unotif_select_own"   ON public.utility_notifications       FOR SELECT USING (
  target_user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
    AND p.department = (SELECT code FROM public.utility_organizations WHERE id = target_org_id))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "unotif_update_own"   ON public.utility_notifications       FOR UPDATE USING (
  target_user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- MOD 8: Seed Data Additions
-- ============================================================

-- Add new columns data to existing utility_infrastructure records
UPDATE public.utility_infrastructure ui
SET
  condition_score    = CASE
    WHEN EXTRACT(YEAR FROM AGE(NOW(), COALESCE(installation_date, '2000-01-01'::date))) > 35 THEN 30 + FLOOR(RANDOM()*20)
    WHEN EXTRACT(YEAR FROM AGE(NOW(), COALESCE(installation_date, '2000-01-01'::date))) > 20 THEN 50 + FLOOR(RANDOM()*20)
    WHEN EXTRACT(YEAR FROM AGE(NOW(), COALESCE(installation_date, '2000-01-01'::date))) > 10 THEN 65 + FLOOR(RANDOM()*20)
    ELSE 80 + FLOOR(RANDOM()*15)
  END,
  risk_level         = CASE
    WHEN material = 'AC' THEN 'critical'
    WHEN material = 'CI' AND EXTRACT(YEAR FROM AGE(NOW(), COALESCE(installation_date, '2000-01-01'::date))) > 30 THEN 'high'
    WHEN EXTRACT(YEAR FROM AGE(NOW(), COALESCE(installation_date, '2000-01-01'::date))) > 25 THEN 'medium'
    ELSE 'low'
  END,
  is_critical_infra  = utility_type IN ('water_supply','electricity','gas'),
  is_high_pressure   = utility_type IN ('gas','oil'),
  repair_count       = FLOOR(RANDOM() * 8)::INT,
  accuracy_class     = CASE survey_method
    WHEN 'gpr' THEN 'A'
    WHEN 'as_built' THEN 'B'
    WHEN 'manual' THEN 'C'
    ELSE 'D'
  END
WHERE condition_score IS NULL OR risk_level = 'none';

-- Seed utility nodes (manholes and valves)
INSERT INTO public.utility_nodes
  (asset_id, utility_org_id, node_type, utility_type, geom, depth_m, description, status)
SELECT
  ui.id, ui.utility_org_id,
  CASE ui.utility_type
    WHEN 'water_supply' THEN 'valve'
    WHEN 'sewer' THEN 'manhole'
    WHEN 'gas' THEN 'valve'
    ELSE 'junction'
  END,
  ui.utility_type,
  ST_StartPoint(ui.geom),
  ui.depth_avg_m,
  'Start node — ' || ui.road_name,
  'active'
FROM public.utility_infrastructure ui
WHERE ui.geom IS NOT NULL;

-- Seed maintenance history for old/critical assets
INSERT INTO public.asset_maintenance_history
  (asset_id, maintenance_type, performed_date, description, before_condition, notes)
SELECT
  ui.id,
  CASE WHEN ui.repair_count > 3 THEN 'emergency' ELSE 'inspection' END,
  CURRENT_DATE - INTERVAL '6 months',
  'Routine condition assessment',
  ui.condition_score,
  'Assessed as part of annual infrastructure review'
FROM public.utility_infrastructure ui
WHERE ui.status = 'active';
