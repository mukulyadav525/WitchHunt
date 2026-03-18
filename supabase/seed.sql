-- MEGA SEED SCRIPT FOR ROADTWIN INDIA v3.0 (DELHI REGION)
-- Focus: National Capital Territory - Full Enterprise Grid

-- 1. ROAD SEGMENTS (15 Strategic Corridors)
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
ON CONFLICT (road_id) DO NOTHING;

-- 2. UTILITY ORGANIZATIONS
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

-- 3. UTILITY INFRASTRUCTURE (v3 Lifecycle Data)
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
   OR (uo.code = 'IGL' AND rs.road_id = 'RS-DEL-003') OR (uo.code = 'TATA-P' AND rs.road_id = 'RS-DEL-003');

-- 4. COMPLAINTS (Agency Assigned)
INSERT INTO public.complaints (complaint_text, road_name, status, urgency_score, defect_type, sentiment, citizen_name, assigned_org_id)
SELECT 'Road sunken near AIIMS metro, gas leak suspected.', 'Ring Road (AIIMS-Sarojini)', 'open', 5, 'surface_damage', 'critical', 'Sandeep Tyagi', id
FROM public.utility_organizations WHERE code = 'IGL' LIMIT 1;

-- 5. EXCAVATION PERMITS
INSERT INTO public.excavation_permits (organization, contact_name, purpose, road_name, requested_start_date, requested_end_date, status, urgency) VALUES
('IGL', 'Mr. Dixit', 'Gas pipeline maintenance', 'Connaught Place (Inner Circle)', '2026-05-01', '2026-05-15', 'approved', 'normal'),
('BSES-R', 'Anuj S.', 'Cable replacement', 'Lodhi Road', '2026-05-05', '2026-05-07', 'pending', 'urgent');

-- 6. AI CONFIGURATION
INSERT INTO public.ai_configurations (config_key, module, display_name, description, system_prompt, model_name, model_provider) VALUES
('digging_advisor', 'excavation', 'DigSafe AI', 'Evaluates excavation safety based on utility density', 'You are a safety officer...', 'gemini-2.0-flash', 'google')
ON CONFLICT (config_key) DO NOTHING;
