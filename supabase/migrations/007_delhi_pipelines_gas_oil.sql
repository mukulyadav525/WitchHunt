-- ============================================================
-- DELHI INFRASTRUCTURE SEED - PART 3: GAS & OIL
-- ============================================================

-- 1. GAS PIPELINES (IGL & GAIL)
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
('IGL','pipeline','gas','HDPE',  315,'315mm HDPE MP gas distribution main',   'Connaught Place Outer Circle','{"lat":28.6309,"lng":77.2155}','{"lat":28.6329,"lng":77.2178}',1.2,1.0,1.4,'2008-05-15',50,'good',   'IGL primary CP zone gas main'),
('IGL','pipeline','gas','HDPE',  250,'250mm HDPE MP distribution',             'Janpath',                    '{"lat":28.6262,"lng":77.2162}','{"lat":28.6282,"lng":77.2185}',1.2,1.0,1.4,'2010-07-20',50,'good',   ''),
('IGL','pipeline','gas','Steel', 508,'508mm Steel HP transmission',            'Mathura Road',               '{"lat":28.5702,"lng":77.2419}','{"lat":28.5722,"lng":77.2442}',1.5,1.3,1.8,'2005-09-10',40,'good',   'IGL HP trunk line — critical — no excavation without IGL NOC'),
('IGL','pipeline','gas','HDPE',  200,'200mm HDPE LP distribution',             'Aurobindo Marg',             '{"lat":28.5472,"lng":77.2026}','{"lat":28.5492,"lng":77.2049}',1.0,0.8,1.2,'2012-04-15',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  315,'315mm HDPE MP main',                    'Ring Road — Full',           '{"lat":28.6133,"lng":77.2085}','{"lat":28.6153,"lng":77.2108}',1.3,1.1,1.5,'2009-06-20',50,'good',   ''),
('IGL','pipeline','gas','Steel', 406,'406mm Steel HP transmission',            'NH-44 (GT Road)',            '{"lat":28.7006,"lng":77.1946}','{"lat":28.7026,"lng":77.1969}',1.5,1.3,1.8,'2003-08-10',40,'good',   'HP trunk — GAIL/IGL joint operation'),
('IGL','pipeline','gas','HDPE',  250,'250mm HDPE MP distribution',             'Mall Road',                  '{"lat":28.7034,"lng":77.1777}','{"lat":28.7054,"lng":77.1800}',1.2,1.0,1.4,'2011-11-15',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  200,'200mm HDPE LP residential',              'Rohini Sector Road',         '{"lat":28.7378,"lng":77.1024}','{"lat":28.7398,"lng":77.1047}',1.0,0.8,1.2,'2014-03-20',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  315,'315mm HDPE MP main',                    'Dwarka Expressway',          '{"lat":28.5915,"lng":77.0274}','{"lat":28.5935,"lng":77.0297}',1.2,1.0,1.4,'2018-10-10',50,'good',   'Dwarka phase 2 gas network'),
('IGL','pipeline','gas','HDPE',  250,'250mm HDPE MP distribution',             'Pankha Road',                '{"lat":28.6150,"lng":77.0723}','{"lat":28.6170,"lng":77.0746}',1.2,1.0,1.4,'2013-05-15',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  200,'200mm HDPE LP service',                  'Janakpuri Road',             '{"lat":28.6228,"lng":77.0792}','{"lat":28.6248,"lng":77.0815}',1.0,0.8,1.2,'2015-08-20',50,'good',   ''),
('IGL','pipeline','gas','Steel', 508,'508mm Steel HP trunk',                   'NH-48 (Delhi-Jaipur Hwy)',  '{"lat":28.5571,"lng":77.0630}','{"lat":28.5591,"lng":77.0653}',1.6,1.4,1.9,'2004-06-10',40,'good',   'National HP corridor — PNGRB regulated'),
('IGL','pipeline','gas','HDPE',  315,'315mm HDPE MP main',                    'Outer Ring Road — South',    '{"lat":28.5016,"lng":77.1734}','{"lat":28.5036,"lng":77.1757}',1.3,1.1,1.5,'2011-03-15',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  200,'200mm HDPE LP distribution',             'Hauz Khas Road',             '{"lat":28.5486,"lng":77.2056}','{"lat":28.5506,"lng":77.2079}',1.0,0.8,1.2,'2016-07-20',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  250,'250mm HDPE MP main',                    'Greater Kailash Road',       '{"lat":28.5501,"lng":77.2399}','{"lat":28.5521,"lng":77.2422}',1.2,1.0,1.4,'2013-10-10',50,'good',   ''),
('IGL','pipeline','gas','HDPE',  315,'315mm HDPE MP main',                    'Vikas Marg',                 '{"lat":28.6262,"lng":77.2962}','{"lat":28.6282,"lng":77.2985}',1.3,1.1,1.5,'2010-12-15',50,'good',   ''),
('IGL', 'pipeline', 'gas', 'HDPE', 200, '200mm HDPE LP distribution', 'Patparganj Road', '{"lat":28.6123,"lng":77.2915}', '{"lat":28.6143,"lng":77.2938}', 1.0, 0.8, 1.2, '2014-04-20', 50, 'good', ''),
('IGL', 'pipeline', 'gas', 'Steel', 406, '406mm Steel HP main', 'GTB Road', '{"lat":28.7059,"lng":77.2012}', '{"lat":28.7079,"lng":77.2035}', 1.5, 1.3, 1.8, '2006-07-10', 40, 'good', 'HP line to North Delhi — critical infrastructure'),
('IGL', 'pipeline', 'gas', 'HDPE', 250, '250mm HDPE MP main', 'Chandni Chowk', '{"lat":28.6500,"lng":77.2328}', '{"lat":28.6520,"lng":77.2351}', 1.0, 0.8, 1.2, '2009-09-15', 50, 'fair', 'Heritage area — strict excavation protocol'),
('IGL', 'pipeline', 'gas', 'HDPE', 200, '200mm HDPE LP distribution', 'Shahdara Main Road', '{"lat":28.6705,"lng":77.2886}', '{"lat":28.6725,"lng":77.2909}', 1.0, 0.8, 1.2, '2012-11-20', 50, 'good', ''),
('GAIL','pipeline','gas','Steel',762,'762mm Steel HP national gas corridor',   'NH-44 (GT Road)',            '{"lat":28.7008,"lng":77.1948}','{"lat":28.7028,"lng":77.1971}',2.0,1.8,2.3,'2000-04-15',40,'good',   'GAIL HBJ pipeline — national gas transport — no dig without GAIL NOC'),
('GAIL','pipeline','gas','Steel',610,'610mm Steel HP gas trunk',               'Ring Road — Full',           '{"lat":28.6135,"lng":77.2087}','{"lat":28.6155,"lng":77.2110}',2.0,1.8,2.3,'1998-09-20',40,'fair',   'GAIL trunk — 26yr steel — cathodic protection active'),
('GAIL','pipeline','gas','Steel',508,'508mm Steel HP feeder',                  'NH-48 (Delhi-Jaipur Hwy)',  '{"lat":28.5573,"lng":77.0632}','{"lat":28.5593,"lng":77.0655}',2.0,1.8,2.3,'2001-06-10',40,'good',   'GAIL feeder to Badarpur power plant')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;

-- 2. OIL PIPELINES (HPCL, IOCL, BPCL)
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
('HPCL','pipeline','oil','Steel',508,'508mm Steel petroleum product pipeline', 'NH-44 (GT Road)',            '{"lat":28.7010,"lng":77.1950}','{"lat":28.7030,"lng":77.1973}',2.5,2.2,2.8,'1995-06-15',40,'fair',   'HPCL product pipeline — HSD/Petrol — buried deepest in corridor'),
('HPCL','pipeline','oil','Steel',406,'406mm Steel HSD pipeline',               'Ring Road — Full',           '{"lat":28.6137,"lng":77.2089}','{"lat":28.6157,"lng":77.2112}',2.5,2.2,2.8,'1997-09-20',40,'fair',   'HPCL petroleum trunk — cathodic protection installed 2019'),
('HPCL','pipeline','oil','Steel',508,'508mm Steel product pipeline',           'NH-48 (Delhi-Jaipur Hwy)',  '{"lat":28.5575,"lng":77.0634}','{"lat":28.5595,"lng":77.0657}',2.5,2.2,2.8,'1993-04-10',40,'fair',   'HPCL supply to Delhi airport and south Delhi depots'),
('IOCL','pipeline','oil','Steel',610,'610mm Steel crude/product',              'NH-44 (GT Road)',            '{"lat":28.7012,"lng":77.1952}','{"lat":28.7032,"lng":77.1975}',2.8,2.5,3.1,'1988-11-15',40,'fair',   'IOCL Panipat-Delhi pipeline — critical national infra'),
('IOCL','pipeline','oil','Steel',406,'406mm Steel product pipeline',           'Mathura Road',               '{"lat":28.5704,"lng":77.2421}','{"lat":28.5724,"lng":77.2444}',2.5,2.2,2.8,'1992-07-20',40,'fair',   'IOCL Mathura refinery product line'),
('BPCL','pipeline','oil','Steel',356,'356mm Steel petroleum',                  'Ring Road — Full',           '{"lat":28.6139,"lng":77.2091}','{"lat":28.6159,"lng":77.2114}',2.3,2.0,2.6,'1999-03-10',40,'fair',   'BPCL Delhi supply pipeline')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;
