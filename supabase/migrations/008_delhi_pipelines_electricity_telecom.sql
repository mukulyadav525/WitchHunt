-- ============================================================
-- DELHI INFRASTRUCTURE SEED - PART 4: ELECTRICITY & TELECOM
-- ============================================================

-- 1. ELECTRICITY — HIGH VOLTAGE (BSES, TPDDL, PGCIL, NDMC)
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
('BSES_R','cable','electricity','XLPE',NULL,'220kV underground cable',         'Ring Road — Full',           '{"lat":28.6141,"lng":77.2093}','{"lat":28.6161,"lng":77.2116}',2.0,1.8,2.3,'2015-08-20',35,'good',   '220kV backbone — BSES Rajdhani'),
('BSES_R','cable','electricity','XLPE',NULL,'33kV feeder cable',               'Outer Ring Road — South',    '{"lat":28.5018,"lng":77.1736}','{"lat":28.5038,"lng":77.1759}',1.5,1.3,1.8,'2018-04-15',35,'good',   ''),
('BSES_R','cable','electricity','XLPE',NULL,'11kV distribution cable',         'Mehrauli-Gurgaon Road',      '{"lat":28.5236,"lng":77.1843}','{"lat":28.5256,"lng":77.1866}',1.3,1.1,1.6,'2019-07-20',35,'good',   ''),
('BSES_R','cable','electricity','XLPE',NULL,'11kV feeder',                     'Dwarka Expressway',          '{"lat":28.5917,"lng":77.0276}','{"lat":28.5937,"lng":77.0299}',1.3,1.1,1.6,'2020-02-10',35,'good',   'New Dwarka infra'),
('BSES_R','cable','electricity','XLPE',NULL,'33kV feeder',                     'Palam Road',                 '{"lat":28.5918,"lng":77.1072}','{"lat":28.5938,"lng":77.1095}',1.5,1.3,1.8,'2017-09-15',35,'good',   ''),
('BSES_R','cable','electricity','PILC',NULL,'11kV old PILC cable — replace',   'Mathura Road',               '{"lat":28.5706,"lng":77.2423}','{"lat":28.5726,"lng":77.2446}',1.2,1.0,1.5,'1992-05-20',35,'poor',   '32yr PILC — dielectric deterioration — replace 2025-26'),
('BSES_Y','cable','electricity','XLPE',NULL,'220kV underground cable',         'NH-9 (Delhi-Meerut Expwy)', '{"lat":28.6720,"lng":77.3448}','{"lat":28.6740,"lng":77.3471}',2.0,1.8,2.3,'2016-06-10',35,'good',   'BSES Yamuna 220kV trunk'),
('BSES_Y','cable','electricity','XLPE',NULL,'33kV feeder cable',               'Vikas Marg',                 '{"lat":28.6264,"lng":77.2964}','{"lat":28.6284,"lng":77.2987}',1.5,1.3,1.8,'2017-10-15',35,'good',   ''),
('BSES_Y','cable','electricity','XLPE',NULL,'11kV distribution cable',         'Shahdara Main Road',         '{"lat":28.6707,"lng":77.2888}','{"lat":28.6727,"lng":77.2911}',1.3,1.1,1.6,'2018-02-20',35,'good',   ''),
('BSES_Y','cable','electricity','PILC',NULL,'33kV old PILC — replace',         'GTB Road',                   '{"lat":28.7061,"lng":77.2014}','{"lat":28.7081,"lng":77.2037}',1.4,1.2,1.7,'1989-08-10',35,'poor',   '35yr PILC — joints failing — urgent cable pull through'),
('TPDDL', 'cable','electricity','XLPE',NULL,'220kV underground cable',         'NH-44 (GT Road)',            '{"lat":28.7014,"lng":77.1954}','{"lat":28.7034,"lng":77.1977}',2.0,1.8,2.3,'2014-11-15',35,'good',   'TPDDL North Delhi 220kV backbone'),
('TPDDL', 'cable','electricity','XLPE',NULL,'33kV feeder',                     'Mall Road',                  '{"lat":28.7036,"lng":77.1779}','{"lat":28.7056,"lng":77.1802}',1.5,1.3,1.8,'2016-04-20',35,'good',   ''),
('TPDDL', 'cable','electricity','XLPE',NULL,'11kV distribution',               'Rohini Sector Road',         '{"lat":28.7380,"lng":77.1026}','{"lat":28.7400,"lng":77.1049}',1.3,1.1,1.6,'2017-08-10',35,'good',   ''),
('TPDDL', 'cable','electricity','XLPE',NULL,'11kV feeder',                     'Pitampura Main Road',        '{"lat":28.7001,"lng":77.1302}','{"lat":28.7021,"lng":77.1325}',1.3,1.1,1.6,'2018-12-15',35,'good',   ''),
('TPDDL', 'cable','electricity','XLPE',NULL,'33kV feeder',                     'Outer Ring Road — NW',       '{"lat":28.7103,"lng":77.1102}','{"lat":28.7123,"lng":77.1125}',1.5,1.3,1.8,'2019-05-20',35,'good',   ''),
('PGCIL', 'cable','electricity','XLPE',NULL,'400kV underground cable',         'Ring Road — Full',           '{"lat":28.6143,"lng":77.2095}','{"lat":28.6163,"lng":77.2118}',2.5,2.2,2.8,'2018-09-10',35,'good',   'PGCIL 400kV — national grid — deepest cable in corridor'),
('PGCIL', 'cable','electricity','XLPE',NULL,'400kV underground cable',         'NH-44 (GT Road)',            '{"lat":28.7016,"lng":77.1956}','{"lat":28.7036,"lng":77.1979}',2.5,2.2,2.8,'2017-11-15',35,'good',   'PGCIL inter-state trunk'),
('NDMC_ELC','cable','electricity','XLPE',NULL,'33kV feeder — NDMC zone',       'Connaught Place Outer Circle','{"lat":28.6311,"lng":77.2157}','{"lat":28.6331,"lng":77.2180}',1.5,1.3,1.8,'2016-03-20',35,'good',   ''),
('NDMC_ELC','cable','electricity','XLPE',NULL,'11kV distribution — NDMC',      'Rajpath (Kartavya Path)',    '{"lat":28.6123,"lng":77.2279}','{"lat":28.6143,"lng":77.2302}',1.3,1.1,1.6,'2015-07-10',35,'good',   '')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;

-- 2. TELECOM — FIBER (BSNL, Airtel, Jio, Vodafone, MTNL, Sterlite)
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
('BSNL_DL','duct','telecom','HDPE',NULL,'96-core OFC — national backbone',     'NH-44 (GT Road)',            '{"lat":28.7018,"lng":77.1958}','{"lat":28.7038,"lng":77.1981}',1.2,1.0,1.5,'2018-06-15',25,'good',   'BSNL NLD — national long distance backbone'),
('BSNL_DL','duct','telecom','HDPE',NULL,'48-core OFC — city backbone',         'Ring Road — Full',           '{"lat":28.6145,"lng":77.2097}','{"lat":28.6165,"lng":77.2120}',1.2,1.0,1.5,'2016-09-20',25,'good',   'BSNL city ring network'),
('BSNL_DL','duct','telecom','HDPE',NULL,'24-core OFC — distribution',          'Mall Road',                  '{"lat":28.7038,"lng":77.1781}','{"lat":28.7058,"lng":77.1804}',1.0,0.8,1.2,'2017-04-10',25,'good',   ''),
('BSNL_DL','duct','telecom','HDPE',NULL,'48-core OFC — city',                  'Vikas Marg',                 '{"lat":28.6266,"lng":77.2966}','{"lat":28.6286,"lng":77.2989}',1.2,1.0,1.5,'2015-11-15',25,'good',   ''),
('BSNL_DL','duct','telecom','HDPE',NULL,'24-core OFC',                         'Chandni Chowk',              '{"lat":28.6502,"lng":77.2330}','{"lat":28.6522,"lng":77.2353}',1.0,0.8,1.2,'2016-07-20',25,'good',   'Heritage zone routing — protected conduit'),
('BSNL_DL','cable','telecom','copper',NULL,'100-pair copper — legacy',          'Connaught Place Outer Circle','{"lat":28.6313,"lng":77.2159}','{"lat":28.6333,"lng":77.2182}',1.0,0.8,1.2,'1998-03-10',30,'poor',   '26yr copper — active PSTN — migration to OFC pending'),
('MTNL_DL','cable','telecom','copper',NULL,'200-pair copper PSTN',              'Sansad Marg',                '{"lat":28.6224,"lng":77.2099}','{"lat":28.6244,"lng":77.2122}',1.0,0.8,1.2,'1995-08-15',30,'poor',   'MTNL legacy copper — 29yr — partial FTTH migration done'),
('MTNL_DL','duct','telecom','HDPE',NULL,'48-core OFC — MTNL',                  'Janpath',                    '{"lat":28.6266,"lng":77.2166}','{"lat":28.6286,"lng":77.2189}',1.0,0.8,1.2,'2014-06-20',25,'good',   ''),
('AIRTEL', 'duct','telecom','HDPE',NULL,'288-core OFC — Airtel backbone',       'NH-44 (GT Road)',            '{"lat":28.7020,"lng":77.1960}','{"lat":28.7040,"lng":77.1983}',1.0,0.8,1.3,'2019-09-10',25,'good',   'Airtel NLD backbone — 4G/5G backhaul'),
('AIRTEL', 'duct','telecom','HDPE',NULL,'144-core OFC',                         'Ring Road — Full',           '{"lat":28.6147,"lng":77.2099}','{"lat":28.6167,"lng":77.2122}',1.0,0.8,1.3,'2018-12-15',25,'good',   ''),
('AIRTEL', 'duct','telecom','HDPE',NULL,'96-core OFC',                          'Outer Ring Road — South',    '{"lat":28.5020,"lng":77.1738}','{"lat":28.5040,"lng":77.1761}',1.0,0.8,1.3,'2019-04-20',25,'good',   ''),
('AIRTEL', 'duct','telecom','HDPE',NULL,'72-core OFC',                          'Dwarka Expressway',          '{"lat":28.5919,"lng":77.0278}','{"lat":28.5939,"lng":77.0301}',1.0,0.8,1.3,'2020-06-10',25,'good',   ''),
('AIRTEL', 'duct','telecom','HDPE',NULL,'48-core OFC',                          'Rohini Sector Road',         '{"lat":28.7382,"lng":77.1028}','{"lat":28.7402,"lng":77.1051}',1.0,0.8,1.3,'2020-10-15',25,'good',   ''),
('RJIO',   'duct','telecom','HDPE',NULL,'432-core OFC — Jio gigafiber',         'NH-44 (GT Road)',            '{"lat":28.7022,"lng":77.1962}','{"lat":28.7042,"lng":77.1985}',1.0,0.8,1.2,'2020-03-20',25,'good',   'Jio GigaFiber backbone Delhi'),
('RJIO',   'duct','telecom','HDPE',NULL,'288-core OFC',                         'Ring Road — Full',           '{"lat":28.6149,"lng":77.2101}','{"lat":28.6169,"lng":77.2124}',1.0,0.8,1.2,'2019-10-10',25,'good',   ''),
('RJIO',   'duct','telecom','HDPE',NULL,'144-core OFC — Jio distribution',      'Mathura Road',               '{"lat":28.5708,"lng":77.2425}','{"lat":28.5728,"lng":77.2448}',1.0,0.8,1.2,'2020-07-15',25,'good',   ''),
('RJIO',   'duct','telecom','HDPE',NULL,'96-core OFC',                          'Vikas Marg',                 '{"lat":28.6268,"lng":77.2968}','{"lat":28.6288,"lng":77.2991}',1.0,0.8,1.2,'2021-02-20',25,'good',   ''),
('RJIO',   'duct','telecom','HDPE',NULL,'144-core OFC',                         'NH-9 (Delhi-Meerut Expwy)', '{"lat":28.6722,"lng":77.3450}','{"lat":28.6742,"lng":77.3473}',1.0,0.8,1.2,'2020-11-10',25,'good',   ''),
('RJIO',   'duct','telecom','HDPE',NULL,'96-core OFC',                          'GTB Road',                   '{"lat":28.7063,"lng":77.2016}','{"lat":28.7083,"lng":77.2039}',1.0,0.8,1.2,'2021-05-15',25,'good',   ''),
('VODA',   'duct','telecom','HDPE',NULL,'144-core OFC — Vi',                    'Ring Road — Full',           '{"lat":28.6151,"lng":77.2103}','{"lat":28.6171,"lng":77.2126}',1.0,0.8,1.2,'2018-08-20',25,'good',   'Vodafone Idea NLD cable'),
('VODA',   'duct','telecom','HDPE',NULL,'96-core OFC',                          'NH-44 (GT Road)',            '{"lat":28.7024,"lng":77.1964}','{"lat":28.7044,"lng":77.1987}',1.0,0.8,1.2,'2017-12-10',25,'good',   ''),
('STERLITE','duct','telecom','HDPE',NULL,'576-core OFC — Sterlite BharatNet',   'NH-44 (GT Road)',            '{"lat":28.7026,"lng":77.1966}','{"lat":28.7046,"lng":77.1989}',1.2,1.0,1.5,'2022-04-15',25,'good',   'BharatNet Phase 2 — government backbone'),
('STERLITE','duct','telecom','HDPE',NULL,'288-core OFC — BharatNet',            'NH-9 (Delhi-Meerut Expwy)', '{"lat":28.6724,"lng":77.3452}','{"lat":28.6744,"lng":77.3475}',1.2,1.0,1.5,'2022-08-20',25,'good',   '')
) AS v(org,itype,utype,mat,dia,cap,road,sloc,eloc,davg,dmin,dmax,install,life,cond,note)
ON o.code = v.org;
