-- ============================================================
-- DELHI INFRASTRUCTURE SEED - PART 2: WATER & SEWER
-- ============================================================

-- 1. WATER SUPPLY PIPELINES
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
('DJB','pipeline','water_supply','CI',  450,'450mm CI trunk main',             'Connaught Place Outer Circle','{"lat":28.6305,"lng":77.2150}','{"lat":28.6325,"lng":77.2185}',2.0,1.8,2.3,'1978-04-15',50,'fair',   '1985 inspection found corrosion — partial relining done'),
('DJB','pipeline','water_supply','DI',  300,'300mm DI distribution main',      'Janpath',                    '{"lat":28.6260,"lng":77.2160}','{"lat":28.6278,"lng":77.2175}',1.8,1.6,2.0,'2002-06-10',50,'good',   ''),
('DJB','pipeline','water_supply','HDPE',150,'150mm HDPE service main',         'Sansad Marg',                '{"lat":28.6220,"lng":77.2095}','{"lat":28.6235,"lng":77.2112}',1.5,1.3,1.7,'2015-03-20',50,'good',   ''),
('DJB','pipeline','water_supply','CI',  600,'600mm CI trunk main — critical',  'Mathura Road',               '{"lat":28.5698,"lng":77.2415}','{"lat":28.5715,"lng":77.2438}',2.5,2.2,2.8,'1972-09-10',50,'poor',   '40yr old CI pipe — high replacement priority'),
('DJB','pipeline','water_supply','DI',  400,'400mm DI transmission main',      'Rajpath (Kartavya Path)',    '{"lat":28.6120,"lng":77.2285}','{"lat":28.6138,"lng":77.2308}',2.0,1.8,2.2,'2005-11-15',50,'good',   ''),
('DJB', 'pipeline', 'water_supply', 'CI', 500, '500mm CI trunk main', 'Aurobindo Marg', '{"lat":28.5468,"lng":77.2022}', '{"lat":28.5490,"lng":77.2040}', 2.2, 2.0, 2.5, '1981-06-20', 50, 'poor', 'Corrosion detected 2022 — repair pending'),
('DJB', 'pipeline', 'water_supply', 'DI', 300, '300mm DI distribution', 'Vikas Marg', '{"lat":28.6258,"lng":77.2958}', '{"lat":28.6278,"lng":77.2978}', 1.8, 1.6, 2.0, '2008-09-15', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'HDPE', 200, '200mm HDPE distribution', 'Ring Road — Kashmere Gate', '{"lat":28.6668,"lng":77.2262}', '{"lat":28.6688,"lng":77.2285}', 1.6, 1.4, 1.8, '2018-02-10', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 350, '350mm DI distribution main', 'GTB Road', '{"lat":28.7055,"lng":77.2008}', '{"lat":28.7075,"lng":77.2030}', 1.9, 1.7, 2.1, '2010-07-15', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'CI', 550, '550mm CI trunk main', 'Rohtak Road', '{"lat":28.6639,"lng":77.0925}', '{"lat":28.6659,"lng":77.0948}', 2.3, 2.1, 2.6, '1975-05-20', 50, 'critical', '50 yr old CI pipe — failure risk HIGH — urgent replacement'),
('DJB', 'pipeline', 'water_supply', 'DI', 300, '300mm DI distribution', 'Mall Road', '{"lat":28.7030,"lng":77.1773}', '{"lat":28.7050,"lng":77.1793}', 1.8, 1.6, 2.0, '2007-12-10', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'HDPE', 250, '250mm HDPE distribution', 'Pankha Road', '{"lat":28.6148,"lng":77.0721}', '{"lat":28.6168,"lng":77.0744}', 1.6, 1.4, 1.8, '2016-08-20', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 400, '400mm DI supply main', 'Dwarka Expressway', '{"lat":28.5911,"lng":77.0270}', '{"lat":28.5931,"lng":77.0293}', 2.0, 1.8, 2.2, '2019-05-15', 50, 'good', 'New installation for Dwarka expansion'),
('DJB', 'pipeline', 'water_supply', 'CI', 450, '450mm CI main', 'Mehrauli-Gurgaon Road', '{"lat":28.5234,"lng":77.1841}', '{"lat":28.5254,"lng":77.1864}', 2.1, 1.9, 2.4, '1983-07-10', 50, 'poor', 'AC pipe replacement scheduled 2026'),
('DJB', 'pipeline', 'water_supply', 'HDPE', 300, '300mm HDPE distribution', 'Outer Ring Road — South', '{"lat":28.5012,"lng":77.1730}', '{"lat":28.5032,"lng":77.1753}', 1.8, 1.6, 2.0, '2020-01-15', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 350, '350mm DI main', 'Lodi Road', '{"lat":28.5919,"lng":77.2283}', '{"lat":28.5939,"lng":77.2303}', 1.9, 1.7, 2.1, '2012-04-20', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'CI', 500, '500mm CI trunk main', 'NH-44 (GT Road)', '{"lat":28.7002,"lng":77.1942}', '{"lat":28.7022,"lng":77.1965}', 2.4, 2.2, 2.7, '1969-08-15', 50, 'critical', '55yr CI pipe — 3 bursts in last 2 years — emergency replacement needed'),
('DJB', 'pipeline', 'water_supply', 'DI', 300, '300mm DI distribution', 'Vikas Marg', '{"lat":28.6268,"lng":77.2966}', '{"lat":28.6288,"lng":77.2989}', 1.8, 1.6, 2.0, '2011-03-10', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'HDPE', 200, '200mm HDPE local supply', 'Saket Road', '{"lat":28.5216,"lng":77.2131}', '{"lat":28.5236,"lng":77.2154}', 1.5, 1.3, 1.7, '2017-06-20', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 400, '400mm DI supply main', 'Greater Kailash Road', '{"lat":28.5497,"lng":77.2395}', '{"lat":28.5517,"lng":77.2418}', 2.0, 1.8, 2.2, '2009-11-10', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'HDPE', 250, '250mm HDPE distribution', 'Hauz Khas Road', '{"lat":28.5484,"lng":77.2054}', '{"lat":28.5504,"lng":77.2077}', 1.6, 1.4, 1.8, '2016-02-15', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'CI', 600, '600mm CI major trunk', 'Ring Road — Full', '{"lat":28.6129,"lng":77.2080}', '{"lat":28.6149,"lng":77.2103}', 2.6, 2.3, 2.9, '1970-05-20', 50, 'critical', '56yr old CI trunk — catastrophic failure risk'),
('DJB', 'pipeline', 'water_supply', 'DI', 350, '350mm DI supply main', 'Chandni Chowk', '{"lat":28.6496,"lng":77.2324}', '{"lat":28.6516,"lng":77.2347}', 1.9, 1.7, 2.1, '2003-08-10', 50, 'fair', 'Heritage area — restricted excavation permissions'),
('DJB', 'pipeline', 'water_supply', 'HDPE', 300, '300mm HDPE distribution', 'Rohini Sector Road', '{"lat":28.7374,"lng":77.1020}', '{"lat":28.7394,"lng":77.1043}', 1.8, 1.6, 2.0, '2015-11-15', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 400, '400mm DI supply main', 'Palam Road', '{"lat":28.5914,"lng":77.1068}', '{"lat":28.5934,"lng":77.1091}', 2.0, 1.8, 2.2, '2010-06-20', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'DI', 300, '300mm DI distribution', 'Shahdara Main Road', '{"lat":28.6701,"lng":77.2882}', '{"lat":28.6721,"lng":77.2905}', 1.8, 1.6, 2.0, '2012-09-10', 50, 'fair', ''),
('DJB', 'pipeline', 'water_supply', 'HDPE', 250, '250mm HDPE local supply', 'Laxmi Nagar Main Road', '{"lat":28.6311,"lng":77.2801}', '{"lat":28.6331,"lng":77.2824}', 1.6, 1.4, 1.8, '2018-04-15', 50, 'good', ''),
('DJB', 'pipeline', 'water_supply', 'AC', 400, '400mm AC pipe — legacy', 'Wazirabad Road', '{"lat":28.7313,"lng":77.2446}', '{"lat":28.7333,"lng":77.2469}', 2.0, 1.8, 2.3, '1988-07-20', 50, 'critical', 'AC pipe — asbestos risk — replacement URGENT'),
('DJB', 'pipeline', 'water_supply', 'DI', 350, '350mm DI supply main', 'Pitampura Main Road', '{"lat":28.6997,"lng":77.1298}', '{"lat":28.7017,"lng":77.1321}', 1.9, 1.7, 2.1, '2011-12-10', 50, 'fair', ''),
('NDMC_WTR','pipeline','water_supply','CI', 300,'300mm CI supply — NDMC zone', 'Connaught Place Inner Circle','{"lat":28.6319,"lng":77.2186}','{"lat":28.6339,"lng":77.2209}',1.8,1.6,2.0,'1982-03-10',50,'poor', 'NDMC zone CI pipe — lifespan exceeded'),
('NDMC_WTR','pipeline','water_supply','DI', 250,'250mm DI distribution',       'Sansad Marg',                '{"lat":28.6218,"lng":77.2093}','{"lat":28.6238,"lng":77.2116}',1.7,1.5,1.9,'2008-06-20',50,'good', ''),
('NDMC_WTR','pipeline','water_supply','DI', 200,'200mm DI local supply',       'Rajpath (Kartavya Path)',    '{"lat":28.6119,"lng":77.2275}','{"lat":28.6139,"lng":77.2298}',1.6,1.4,1.8,'2010-09-15',50,'good', ''),
('NDMC_WTR','pipeline','water_supply','CI', 350,'350mm CI trunk',              'Janpath',                    '{"lat":28.6250,"lng":77.2150}','{"lat":28.6270,"lng":77.2173}',2.0,1.8,2.2,'1975-11-10',50,'critical', 'Heritage NDMC zone — old CI — burst 2023 — repaired')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;

-- 2. SEWER PIPELINES
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
('DJB_SWR','pipeline','sewer','CI',  600,'600mm CI gravity sewer',            'Connaught Place Outer Circle','{"lat":28.6307,"lng":77.2153}','{"lat":28.6327,"lng":77.2176}',3.0,2.7,3.4,'1965-06-10',60,'critical', '60yr CI sewer — multiple collapses — priority replacement'),
('DJB_SWR','pipeline','sewer','RCC', 900,'900mm RCC combined sewer',          'Ring Road — Full',           '{"lat":28.6131,"lng":77.2083}','{"lat":28.6151,"lng":77.2106}',3.5,3.2,4.0,'1972-03-15',60,'poor',   'Large diameter — flow reduced 40% due to sediment'),
('DJB_SWR','pipeline','sewer','CI',  450,'450mm CI sewer main',               'Mathura Road',               '{"lat":28.5700,"lng":77.2417}','{"lat":28.5720,"lng":77.2440}',3.0,2.7,3.3,'1968-09-20',60,'critical', '56yr CI — H2S corrosion — urgent lined or replace'),
('DJB_SWR','pipeline','sewer','RCC', 750,'750mm RCC gravity sewer',           'GTB Road',                   '{"lat":28.7057,"lng":77.2010}','{"lat":28.7087,"lng":77.2033}',3.2,2.9,3.6,'1975-04-10',60,'poor',   'Infiltration causing overflow in monsoon'),
('DJB_SWR','pipeline','sewer','CI',  500,'500mm CI sewer main',               'Rohtak Road',                '{"lat":28.6641,"lng":77.0927}','{"lat":28.6661,"lng":77.0950}',2.8,2.5,3.2,'1970-07-15',60,'critical', '50yr CI — multiple past repairs — replacement overdue'),
('DJB_SWR','pipeline','sewer','PVC', 300,'300mm PVC branch sewer',            'Saket Road',                 '{"lat":28.5218,"lng":77.2133}','{"lat":28.5238,"lng":77.2156}',2.5,2.2,2.8,'2005-11-20',40,'good',   ''),
('DJB_SWR','pipeline','sewer','RCC', 600,'600mm RCC gravity main',            'Aurobindo Marg',             '{"lat":28.5470,"lng":77.2024}','{"lat":28.5490,"lng":77.2047}',3.0,2.7,3.4,'1978-02-10',60,'poor',   'Structural cracks detected in 2021 inspection'),
('DJB_SWR','pipeline','sewer','CI',  550,'550mm CI sewer',                    'NH-44 (GT Road)',            '{"lat":28.7004,"lng":77.1944}','{"lat":28.7024,"lng":77.1967}',3.2,2.9,3.6,'1967-05-15',60,'critical', '57yr — immediate replacement priority'),
('DJB_SWR','pipeline','sewer','PVC', 250,'250mm PVC branch sewer',            'Dwarka Expressway',          '{"lat":28.5913,"lng":77.0272}','{"lat":28.5933,"lng":77.0295}',2.3,2.0,2.6,'2018-08-20',40,'good',   'New area — modern PVC system'),
('DJB_SWR','pipeline','sewer','RCC', 800,'800mm RCC trunk sewer',             'Outer Ring Road — South',    '{"lat":28.5014,"lng":77.1732}','{"lat":28.5034,"lng":77.1755}',3.8,3.5,4.2,'1980-03-10',60,'poor',   'Overloaded during monsoon — expansion needed'),
('DJB_SWR','pipeline','sewer','CI',  400,'400mm CI sewer main',               'Lodi Road',                  '{"lat":28.5921,"lng":77.2285}','{"lat":28.5941,"lng":77.2305}',2.8,2.5,3.1,'1974-06-15',60,'poor',   '50yr+ CI — scheduled for 2026-27 replacement'),
('DJB_SWR','pipeline','sewer','PVC', 300,'300mm PVC local sewer',             'Greater Kailash Road',       '{"lat":28.5499,"lng":77.2397}','{"lat":28.5519,"lng":77.2420}',2.4,2.1,2.7,'2008-10-20',40,'good',   ''),
('DJB_SWR','pipeline','sewer','RCC', 700,'700mm RCC sewer',                   'Vikas Marg',                 '{"lat":28.6260,"lng":77.2960}','{"lat":28.6280,"lng":77.2983}',3.2,2.9,3.6,'1976-01-15',60,'poor',   'Infiltration from Yamuna floodplain'),
('DJB_SWR','pipeline','sewer','CI',  450,'450mm CI sewer main',               'Chandni Chowk',              '{"lat":28.6498,"lng":77.2326}','{"lat":28.6518,"lng":77.2349}',2.8,2.5,3.2,'1960-04-20',60,'critical', '64yr heritage zone pipe — structural failure imminent'),
('DJB_SWR','pipeline','sewer','PVC', 350,'350mm PVC sewer main',              'Rohini Sector Road',         '{"lat":28.7376,"lng":77.1022}','{"lat":28.7396,"lng":77.1045}',2.5,2.2,2.8,'2014-09-10',40,'good',   ''),
('DJB_SWR','pipeline','sewer','RCC', 600,'600mm RCC gravity sewer',           'Mall Road',                  '{"lat":28.7032,"lng":77.1775}','{"lat":28.7052,"lng":77.1798}',3.0,2.7,3.4,'1979-12-15',60,'poor',   ''),
('DJB_SWR','pipeline','sewer','PVC', 300,'300mm PVC branch sewer',            'Pitampura Main Road',        '{"lat":28.6999,"lng":77.1300}','{"lat":28.7019,"lng":77.1323}',2.4,2.1,2.7,'2012-05-20',40,'good',   ''),
('DJB_SWR','pipeline','sewer','CI',  500,'500mm CI sewer main',               'Shahdara Main Road',         '{"lat":28.6703,"lng":77.2884}','{"lat":28.6723,"lng":77.2907}',2.9,2.6,3.3,'1973-08-10',60,'critical', '51yr CI — high risk — replacement pending DJB approval'),
('DJB_SWR','pipeline','sewer','RCC', 650,'650mm RCC sewer',                   'Palam Road',                 '{"lat":28.5916,"lng":77.1070}','{"lat":28.5936,"lng":77.1093}',3.1,2.8,3.5,'1982-03-15',60,'poor',   ''),
('DJB_SWR','pipeline','sewer','PVC', 250,'250mm PVC local sewer',             'Noida Link Road',            '{"lat":28.5885,"lng":77.3091}','{"lat":28.5905,"lng":77.3114}',2.2,2.0,2.5,'2019-06-20',40,'good',   '')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;
