-- 003_production_hardening.sql
-- SECURE RBAC & PERFORMANCE INDEXING FOR DELHI V3.0

-- ==========================================
-- 1. PERFORMANCE & SPATIAL INDEXING
-- ==========================================
-- GIST Indexes for Map Rendering
CREATE INDEX IF NOT EXISTS idx_road_segments_geom ON public.road_segments USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_defects_geom ON public.defects USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_utility_infra_geom ON public.utility_infrastructure USING GIST (geom);

-- B-Tree Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_utility_infra_org ON public.utility_infrastructure(utility_org_id);
CREATE INDEX IF NOT EXISTS idx_complaints_org ON public.complaints(assigned_org_id);
CREATE INDEX IF NOT EXISTS idx_permits_org ON public.excavation_permits(organization);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department);

-- ==========================================
-- 2. SECURITY: ROW LEVEL SECURITY (RLS)
-- ==========================================

-- A. Utility Infrastructure
ALTER TABLE public.utility_infrastructure ENABLE ROW LEVEL SECURITY;

-- Anonymous: View only
CREATE POLICY "Public: view infrastructure" ON public.utility_infrastructure
FOR SELECT USING (true);

-- Engineers: Modify only their own agency's assets
CREATE POLICY "Engineers: manage own infrastructure" ON public.utility_infrastructure
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR p.department = (SELECT code FROM public.utility_organizations WHERE id = utility_org_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR p.department = (SELECT code FROM public.utility_organizations WHERE id = utility_org_id))
  )
);

-- B. Complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Public: Create only
CREATE POLICY "Public: report issues" ON public.complaints
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Public: Track their own or view all (for tracker page)
CREATE POLICY "Public: track issues" ON public.complaints
FOR SELECT USING (true);

-- Agency: Manage assigned tickets
CREATE POLICY "Agency: manage assigned complaints" ON public.complaints
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR p.department = (SELECT code FROM public.utility_organizations WHERE id = assigned_org_id))
  )
);

-- C. Excavation Permits
ALTER TABLE public.excavation_permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standard view: permits" ON public.excavation_permits FOR SELECT USING (true);

CREATE POLICY "Agency manage: permits" ON public.excavation_permits
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR p.department = organization)
  )
);

-- ==========================================
-- 3. UTILITY TRIGGERS
-- ==========================================
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_infra_updated
  BEFORE UPDATE ON public.utility_infrastructure
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
