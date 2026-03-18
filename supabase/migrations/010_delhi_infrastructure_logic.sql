-- ============================================================
-- DELHI INFRASTRUCTURE SEED - PART 6: LOGIC & ENRICHMENT
-- ============================================================

-- 1. UPDATE CONDITION SCORES ON ALL ASSETS
-- This enriches the data based on text tags like 'good','fair','poor','critical'
UPDATE public.utility_infrastructure SET
  condition_score = CASE condition
    WHEN 'good'     THEN 80 + FLOOR(RANDOM()*15)::INT
    WHEN 'fair'     THEN 55 + FLOOR(RANDOM()*20)::INT
    WHEN 'poor'     THEN 30 + FLOOR(RANDOM()*20)::INT
    WHEN 'critical' THEN 10 + FLOOR(RANDOM()*20)::INT
    ELSE 50
  END,
  risk_level = CASE condition
    WHEN 'critical' THEN 'critical'
    WHEN 'poor'     THEN 'high'
    WHEN 'fair'     THEN 'medium'
    WHEN 'good'     THEN 'low'
    ELSE 'none'
  END,
  is_critical_infra = utility_type IN ('water','water_supply','electricity','gas','oil'),
  is_high_pressure  = utility_type IN ('gas','oil'),
  repair_count = FLOOR(RANDOM()*8)::INT
WHERE condition_score IS NULL;

-- 2. SEED UTILITY NODES (manholes, valves, junctions)
-- Start nodes
INSERT INTO public.utility_nodes
  (asset_id, utility_org_id, node_type, utility_type, geom, depth_m, description, status)
SELECT
  ui.id, ui.utility_org_id,
  CASE ui.utility_type
    WHEN 'water_supply' THEN 'valve'
    WHEN 'sewer'        THEN 'manhole'
    WHEN 'gas'          THEN 'valve'
    WHEN 'oil'          THEN 'valve'
    WHEN 'drainage'     THEN 'manhole'
    WHEN 'electricity'  THEN 'junction_box'
    WHEN 'telecom'      THEN 'manhole'
    ELSE                     'junction'
  END,
  ui.utility_type,
  ST_SetSRID(
    ST_MakePoint(
      (ui.start_location->>'lng')::float,
      (ui.start_location->>'lat')::float
    ), 4326
  ),
  ui.depth_avg_m,
  'Start node — ' || ui.road_name || ' (' || (SELECT name FROM public.utility_organizations WHERE id = ui.utility_org_id) || ')',
  'active'
FROM public.utility_infrastructure ui
WHERE ui.start_location IS NOT NULL
  AND ui.start_location->>'lng' IS NOT NULL;

-- End nodes
INSERT INTO public.utility_nodes
  (asset_id, utility_org_id, node_type, utility_type, geom, depth_m, description, status)
SELECT
  ui.id, ui.utility_org_id,
  CASE ui.utility_type
    WHEN 'water_supply' THEN 'valve'
    WHEN 'sewer'        THEN 'manhole'
    WHEN 'gas'          THEN 'valve'
    WHEN 'drainage'     THEN 'manhole'
    ELSE                     'junction'
  END,
  ui.utility_type,
  ST_SetSRID(
    ST_MakePoint(
      (ui.end_location->>'lng')::float,
      (ui.end_location->>'lat')::float
    ), 4326
  ),
  ui.depth_avg_m,
  'End node — ' || ui.road_name,
  'active'
FROM public.utility_infrastructure ui
WHERE ui.end_location IS NOT NULL
  AND ui.end_location->>'lng' IS NOT NULL;

-- 3. SEED MAINTENANCE HISTORY (for critical/poor assets)
INSERT INTO public.asset_maintenance_history
  (asset_id, maintenance_type, performed_date, description, cost_inr, notes)
SELECT
  ui.id,
  CASE ui.condition
    WHEN 'critical' THEN 'emergency'
    WHEN 'poor'     THEN 'repair'
    ELSE                 'inspection'
  END,
  CURRENT_DATE - (FLOOR(RANDOM()*365) || ' days')::interval,
  CASE ui.condition
    WHEN 'critical' THEN 'Emergency repair — structural failure risk identified'
    WHEN 'poor'     THEN 'Repair work — joint failure / corrosion treatment'
    ELSE                 'Annual inspection — condition assessed'
  END,
  CASE ui.condition
    WHEN 'critical' THEN 150000 + FLOOR(RANDOM()*350000)::INT
    WHEN 'poor'     THEN 50000  + FLOOR(RANDOM()*150000)::INT
    ELSE                 10000  + FLOOR(RANDOM()*40000)::INT
  END,
  'Logged by infrastructure management team'
FROM public.utility_infrastructure ui
WHERE ui.condition IN ('critical','poor','fair');
