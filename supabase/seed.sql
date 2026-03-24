-- ============================================================
-- MEGA SEED SCRIPT FOR ROADTWIN INDIA v3.0 (INDORE REGION)
-- Focus: Indore Smart City - Core Enterprise Grid
-- ============================================================

-- 1. CLEANUP (Optional, depends on how you want to run it)
-- TRUNCATE public.road_segments CASCADE;
-- TRUNCATE public.utility_organizations CASCADE;

-- 2. ROAD SEGMENTS (Strategic Corridors in Indore)
INSERT INTO public.road_segments (road_id, name, city, ward, zone, length_km, width_m, surface_type, health_score, total_defects, location) VALUES
('RS-IDR-001', 'AB Road (Palasia to LIG)', 'Indore', 'Ward 45', 'Zone 9', 2.5, 30.0, 'bitumen', 85, 2, '{"lat": 22.7237, "lng": 75.8841}'),
('RS-IDR-002', 'MG Road (Rajwada Circle)', 'Indore', 'Ward 01', 'Zone 1', 0.8, 12.0, 'concrete', 45, 12, '{"lat": 22.7186, "lng": 75.8557}'),
('RS-IDR-003', 'Vijay Nagar Main Road', 'Indore', 'Ward 32', 'Zone 7', 3.2, 25.0, 'bitumen', 92, 1, '{"lat": 22.7533, "lng": 75.8937}'),
('RS-IDR-004', 'Ring Road (Robot Square)', 'Indore', 'Ward 36', 'Zone 8', 5.0, 40.0, 'bitumen', 70, 5, '{"lat": 22.7441, "lng": 75.9080}'),
('RS-IDR-005', 'Bhawarkua Main Road', 'Indore', 'Ward 60', 'Zone 12', 1.5, 20.0, 'bitumen', 60, 8, '{"lat": 22.6916, "lng": 75.8675}'),
('RS-IDR-006', 'Airport Road (60 Feet Road)', 'Indore', 'Ward 15', 'Zone 3', 4.5, 24.0, 'concrete', 88, 3, '{"lat": 22.7225, "lng": 75.8180}'),
('RS-IDR-007', 'Super Corridor (TCS Square)', 'Indore', 'Ward 17', 'Zone 4', 10.0, 60.0, 'bitumen', 98, 0, '{"lat": 22.7750, "lng": 75.8250}'),
('RS-IDR-008', 'Sapna Sangeeta Road', 'Indore', 'Ward 55', 'Zone 11', 1.2, 18.0, 'bitumen', 75, 4, '{"lat": 22.7000, "lng": 75.8750}'),
('RS-IDR-009', 'Yashwant Niwas Road', 'Indore', 'Ward 40', 'Zone 10', 1.0, 15.0, 'bitumen', 90, 1, '{"lat": 22.7200, "lng": 75.8700}'),
('RS-IDR-010', 'Race Course Road', 'Indore', 'Ward 42', 'Zone 10', 0.9, 14.0, 'bitumen', 95, 0, '{"lat": 22.7250, "lng": 75.8780}')
ON CONFLICT (road_id) DO UPDATE SET 
  health_score = EXCLUDED.health_score,
  total_defects = EXCLUDED.total_defects;

-- 3. UTILITY ORGANIZATIONS (Indore Specific)
INSERT INTO public.utility_organizations (code, name, type, color_hex, icon) VALUES
('IMC', 'Indore Municipal Corporation (Water)', 'water', '#3b82f6', '💧'),
('MPPKVVCL', 'MP Paschim Kshetra Vidyut Vitaran', 'electricity', '#ffd700', '⚡'),
('IGL', 'Indore Gas Limited', 'gas', '#ff6b35', '🔥'),
('IDA', 'Indore Development Authority', 'infrastructure', '#8b5cf6', '🏗️'),
('BSNL-IDR', 'BSNL Indore', 'telecom', '#00d4ff', '📡'),
('JIO-IDR', 'Jio Fiber Indore', 'telecom', '#0056b3', '📡'),
('AIRTEL-IDR', 'Airtel Fiber Indore', 'telecom', '#e11d48', '📡')
ON CONFLICT (code) DO NOTHING;

-- 4. UTILITY INFRASTRUCTURE
INSERT INTO public.utility_infrastructure (utility_org_id, road_name, infra_type, utility_type, status, depth_avg_m, material, installation_date, safety_score, condition)
SELECT uo.id, rs.name, 'pipeline', uo.type, 'active', 1.5, 'DI', '2020-01-01'::date, 90, 'good'
FROM public.utility_organizations uo
JOIN public.road_segments rs ON rs.road_id = 'RS-IDR-001'
WHERE uo.code = 'IMC' OR uo.code = 'IGL'
ON CONFLICT DO NOTHING;

INSERT INTO public.utility_infrastructure (utility_org_id, road_name, infra_type, utility_type, status, depth_avg_m, material, installation_date, safety_score, condition)
SELECT uo.id, rs.name, 'cable', uo.type, 'active', 0.8, 'PVC', '2021-06-15'::date, 85, 'good'
FROM public.utility_organizations uo
JOIN public.road_segments rs ON rs.road_id = 'RS-IDR-003'
WHERE uo.code = 'MPPKVVCL' OR uo.code = 'JIO-IDR'
ON CONFLICT DO NOTHING;

-- 5. DEFECTS
INSERT INTO public.defects (road_segment_id, defect_type, severity, confidence, source, status, description, area_sqm, repair_priority, estimated_cost_inr)
SELECT id, 'pothole', '4', 0.95, 'ai_detection', 'open', 'Large pothole at Rajwada crossing', 1.5, 'high', 4500 FROM public.road_segments WHERE road_id = 'RS-IDR-002' LIMIT 1;

INSERT INTO public.defects (road_segment_id, defect_type, severity, confidence, source, status, description, area_sqm, repair_priority, estimated_cost_inr)
SELECT id, 'crack', '2', 0.88, 'citizen_report', 'open', 'Hairline cracks developing near Palasia', 5.0, 'low', 12000 FROM public.road_segments WHERE road_id = 'RS-IDR-001' LIMIT 1;

-- 6. EXCAVATION BUNDLES & PERMITS
INSERT INTO public.excavation_bundles (bundle_code, road_name, permit_count, recommended_start, recommended_end, traffic_impact_score, rationale) VALUES
('BNDL-IDR-001', 'AB Road (Palasia to LIG)', 2, '2026-04-10', '2026-04-20', 65.5, 'Joint maintenance for Gas and Water lines to prevent double digging.')
ON CONFLICT (bundle_code) DO NOTHING;

INSERT INTO public.excavation_permits (organization, contact_name, purpose, road_name, requested_start_date, requested_end_date, status, urgency, depth_m, road_segment_id)
SELECT 'Indore Gas Limited', 'Vikram Singh', 'Laying new pipeline', 'AB Road (Palasia to LIG)', '2026-04-10', '2026-04-20', 'approved', 'normal', 1.5, id
FROM public.road_segments WHERE road_id = 'RS-IDR-001' LIMIT 1;

-- 7. PUBLIC WORKSITES
INSERT INTO public.public_worksites (permit_number, road_name, ward, zone, purpose, department, contractor, status, progress_percent, requested_start_date, requested_end_date)
VALUES
('PRM-IDR-101', 'MG Road (Rajwada Circle)', 'Ward 01', 'Zone 1', 'Heritage road paving', 'IDA', 'BuildCon Indore', 'active', 45, '2026-03-01', '2026-04-15'),
('PRM-IDR-102', 'Bhawarkua Main Road', 'Ward 60', 'Zone 12', 'Flyover pillar construction', 'NHAI', 'Indore Infra Ltd', 'active', 70, '2025-10-01', '2026-05-30')
ON CONFLICT (permit_number) DO NOTHING;

-- 8. COMPLAINTS (Indore Citizen Feed)
INSERT INTO public.complaints (complaint_text, road_name, status, priority, urgency_score, citizen_name, citizen_phone)
VALUES
('Big pothole near Robot Square causing traffic jams.', 'Ring Road (Robot Square)', 'open', 'high', 5, 'Ramesh Gupta', '9876543210'),
('Street lights not working near Sapna Sangeeta cinema.', 'Sapna Sangeeta Road', 'open', 'medium', 3, 'Ananya Sharma', '9827012345'),
('Garbage dumped on road corner near Palasia Square.', 'AB Road (Palasia to LIG)', 'open', 'low', 2, 'Rahul Verma', '9911223344')
ON CONFLICT DO NOTHING;

-- 9. GAMIFICATION (Ward Leaderboard & Champions)
INSERT INTO public.ward_leaderboard (ward, total_points, validated_reports, fix_rate_percent, top_badge) VALUES
('Ward 45', 1250, 45, 88.5, '🏅 Elite Ward'),
('Ward 32', 980, 32, 75.0, '🥈 Star Ward'),
('Ward 01', 540, 18, 42.0, '🥉 Active Ward')
ON CONFLICT (ward) DO NOTHING;

INSERT INTO public.citizen_champions (name, ward, points, badge, validated_reports, streak_days) VALUES
('Amit Jha', 'Ward 45', 450, '🏆 Master Reporter', 15, 7),
('Sonal Kothari', 'Ward 32', 320, '🥈 Civic Star', 10, 4),
('Deepak Malviya', 'Ward 01', 150, '🥉 Rookie', 5, 2)
ON CONFLICT DO NOTHING;

-- 10. CONTRACTOR SCORECARDS
INSERT INTO public.contractor_scorecards (contractor, active_projects, completed_projects, on_time_rate_percent, public_grade, watchlist) VALUES
('BuildCon Indore', 3, 25, 92.0, 'A', false),
('Indore Infra Ltd', 5, 12, 84.5, 'B', false),
('QuickFix Roads', 2, 8, 45.0, 'D', true)
ON CONFLICT (contractor) DO NOTHING;

-- 11. AI CONFIGS
INSERT INTO public.ai_configurations (config_key, module, display_name, description, system_prompt, model_name, model_provider) VALUES
('smart_pothole_detector', 'pothole', 'Indore AI Vision', 'Detects road defects specifically for Indore municipal roads.', 'You are a road analyst for IMC...', 'gemini-2.0-flash', 'google')
ON CONFLICT (config_key) DO NOTHING;
-- 12. PRE-DIG CLEARANCES
INSERT INTO public.pre_dig_clearances (permit_id, permit_number, road_name, ward, organization, status, risk_level, risk_score, critical_conflict_count, utility_types)
SELECT 
  id, 
  permit_number, 
  road_name, 
  'Ward 45', 
  organization, 
  'restricted', 
  'high', 
  72, 
  1, 
  '{"gas", "water"}'::text[]
FROM public.excavation_permits 
WHERE permit_number LIKE 'PERMIT-%' 
LIMIT 1
ON CONFLICT (permit_number) DO NOTHING;
