-- ============================================================
-- DELHI INFRASTRUCTURE SEED - PART 5: DRAINAGE & DMRC
-- ============================================================

-- 1. STORM DRAINAGE (PWD Delhi, NDMC, DDA)
INSERT INTO public.utility_infrastructure
  (utility_org_id, infra_type, utility_type, material, diameter_mm,
   capacity_description, road_name, start_location, end_location,
   depth_avg_m, depth_min_m, depth_max_m,
   installation_date, expected_life_years,
   condition, status, notes)
SELECT o.id, v.itype, v.utype, v.mat, v.dia::int, v.cap, v.road,
  v.sloc::jsonb, v.eloc::jsonb,
  v.davg::decimal, v.dmin::decimal, v.dmax::decimal,
  v.install::date, v.life::int, v.cond, 'active', v.note
FROM public.utility_organizations o
JOIN (VALUES
('PWD_DL','pipeline','drainage','RCC',1200,'1200mm RCC stormwater drain',       'Ring Road — Full',           '{"lat":28.6153,"lng":77.2105}','{"lat":28.6173,"lng":77.2128}',2.5,2.2,3.0,'1985-06-15',50,'poor',   '39yr RCC — silt buildup — 60% capacity'),
('PWD_DL','pipeline','drainage','RCC',900, '900mm RCC storm drain',              'NH-44 (GT Road)',            '{"lat":28.7028,"lng":77.1968}','{"lat":28.7048,"lng":77.1991}',2.2,2.0,2.5,'1978-09-20',50,'critical', '46yr RCC — section collapsed 2024 — temporary repair'),
('PWD_DL','pipeline','drainage','RCC',800, '800mm RCC storm drain',              'Outer Ring Road — South',    '{"lat":28.5022,"lng":77.1740}','{"lat":28.5042,"lng":77.1763}',2.0,1.8,2.3,'2005-03-10',50,'good',   ''),
('PWD_DL','pipeline','drainage','RCC',600, '600mm RCC storm drain',              'Mathura Road',               '{"lat":28.5710,"lng":77.2427}','{"lat":28.5730,"lng":77.2450}',1.8,1.5,2.1,'1990-07-15',50,'poor',   '34yr — frequent monsoon flooding — upgrade needed'),
('PWD_DL','pipeline','drainage','RCC',1000,'1000mm RCC storm drain',             'GTB Road',                   '{"lat":28.7065,"lng":77.2018}','{"lat":28.7085,"lng":77.2041}',2.3,2.0,2.7,'1980-11-20',50,'critical', '44yr — major blockage — causes annual flooding'),
('PWD_DL','pipeline','drainage','RCC',700, '700mm RCC storm drain',              'Vikas Marg',                 '{"lat":28.6270,"lng":77.2970}','{"lat":28.6290,"lng":77.2993}',1.9,1.7,2.2,'1992-04-10',50,'poor',   ''),
('PWD_DL', 'pipeline', 'drainage', 'RCC', 500, '500mm RCC storm drain', 'Mall Road', '{"lat":28.7040,"lng":77.1783}', '{"lat":28.7060,"lng":77.1806}', 1.6, 1.4, 1.9, '2000-08-15', 50, 'fair', ''),
('PWD_DL', 'pipeline', 'drainage', 'RCC', 600, '600mm RCC storm drain', 'Rohtak Road', '{"lat":28.6645,"lng":77.0929}', '{"lat":28.6665,"lng":77.0952}', 1.8, 1.6, 2.1, '1983-12-20', 50, 'critical', '41yr — downstream blockage causing road flooding'),
('NDMC_DRN','pipeline','drainage','RCC',800,'800mm RCC NDMC drain',              'Connaught Place Outer Circle','{"lat":28.6315,"lng":77.2161}','{"lat":28.6335,"lng":77.2184}',2.0,1.8,2.3,'1975-05-10',50,'poor',   'NDMC heritage drain — 49yr — partial refurbishment 2018'),
('NDMC_DRN','pipeline','drainage','RCC',600,'600mm RCC storm drain',             'Rajpath (Kartavya Path)',    '{"lat":28.6125,"lng":77.2281}','{"lat":28.6145,"lng":77.2304}',1.8,1.6,2.1,'1980-09-15',50,'fair',   'Ceremonial road — maintained by NDMC'),
('DDA',    'pipeline','drainage','RCC',1500,'1500mm RCC main outfall drain',     'Ring Road — Full',           '{"lat":28.6155,"lng":77.2107}','{"lat":28.6175,"lng":77.2130}',3.0,2.7,3.5,'1970-03-20',50,'critical', '54yr main outfall — Yamuna flood risk — upgrade DPR prepared')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;

-- 2. DMRC UNDERGROUND INFRASTRUCTURE
INSERT INTO public.utility_infrastructure
  (utility_org_id, infra_type, utility_type, material, diameter_mm,
   capacity_description, road_name, start_location, end_location,
   depth_avg_m, depth_min_m, depth_max_m,
   installation_date, expected_life_years,
   condition, status, notes)
SELECT o.id, v.itype, v.utype, v.mat, v.dia::int, v.cap, v.road,
  v.sloc::jsonb, v.eloc::jsonb,
  v.davg::decimal, v.dmin::decimal, v.dmax::decimal,
  v.install::date, v.life::int, v.cond, 'active', v.note
FROM public.utility_organizations o
JOIN (VALUES
('DMRC','duct','other','Steel',NULL,'DMRC power traction cable — Yellow Line',  'Janpath',                    '{"lat":28.6264,"lng":77.2164}','{"lat":28.6284,"lng":77.2187}',4.0,3.5,5.0,'2002-05-15',40,'good',   'DMRC traction power 25kV — strict no-dig zone within 3m'),
('DMRC','duct','other','Steel',NULL,'DMRC signaling cable — Blue Line',          'Connaught Place Outer Circle','{"lat":28.6317,"lng":77.2163}','{"lat":28.6337,"lng":77.2186}',4.0,3.5,5.0,'2005-09-20',40,'good',   'DMRC signal/telecom cable — 5m exclusion zone'),
('DMRC','duct','other','Steel',NULL,'DMRC traction — Violet Line',               'Mathura Road',               '{"lat":28.5712,"lng":77.2429}','{"lat":28.5732,"lng":77.2452}',5.0,4.5,6.0,'2010-07-10',40,'good',   'Deep tunnel section — 6m below surface'),
('DMRC','duct','other','Steel',NULL,'DMRC power cable — Pink Line',              'Ring Road — Full',           '{"lat":28.6157,"lng":77.2109}','{"lat":28.6177,"lng":77.2132}',4.5,4.0,5.5,'2018-03-15',40,'good',   ''),
('DMRC', 'duct', 'other', 'Steel', NULL, 'DMRC traction — Grey Line', 'Dwarka Expressway', '{"lat":28.5921,"lng":77.0280}', '{"lat":28.5941,"lng":77.0303}', 3.5, 3.0, 4.5, '2019-10-20', 40, 'good', 'Dwarka metro extension traction cables')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;
