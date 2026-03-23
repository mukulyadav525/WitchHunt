-- ============================================================
-- RoadTwin / WitchHunt complete Supabase bootstrap schema
-- Date: 2026-03-24
--
-- What this file covers:
-- 1. Core app tables used by the current frontend and edge functions
-- 2. Newer feature tables currently backed by local demo data
-- 3. Storage buckets used by uploads
-- 4. Default AI config rows required by the edge functions
--
-- This is a permissive "make the app work" bootstrap schema.
-- RLS is disabled on app tables so the current frontend can run
-- without policy work. Tighten security before production launch.
-- ============================================================

-- 0. CLEAN RESET (Drop old tables to avoid schema mismatches)
-- This ensures that "CREATE TABLE IF NOT EXISTS" doesn't skip 
-- tables that exist but have different column names (e.g. road_name vs name).
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.road_segments CASCADE;
DROP TABLE IF EXISTS public.utility_organizations CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.ai_configurations CASCADE;
DROP TABLE IF EXISTS public.defects CASCADE;
DROP TABLE IF EXISTS public.health_predictions CASCADE;
DROP TABLE IF EXISTS public.road_health_scores CASCADE;
DROP TABLE IF EXISTS public.excavation_bundles CASCADE;
DROP TABLE IF EXISTS public.excavation_permits CASCADE;
DROP TABLE IF EXISTS public.permits CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;
DROP TABLE IF EXISTS public.road_image_surveys CASCADE;
DROP TABLE IF EXISTS public.utility_infrastructure CASCADE;
DROP TABLE IF EXISTS public.utility_assets CASCADE;
DROP TABLE IF EXISTS public.utility_conflict_zones CASCADE;
DROP TABLE IF EXISTS public.public_worksites CASCADE;
DROP TABLE IF EXISTS public.notification_subscriptions CASCADE;
DROP TABLE IF EXISTS public.route_alert_subscriptions CASCADE;
DROP TABLE IF EXISTS public.smart_notifications CASCADE;
DROP TABLE IF EXISTS public.traffic_advisories CASCADE;
DROP TABLE IF EXISTS public.citizen_champions CASCADE;
DROP TABLE IF EXISTS public.ward_leaderboard CASCADE;
DROP TABLE IF EXISTS public.civic_reward_rules CASCADE;
DROP TABLE IF EXISTS public.contractor_scorecards CASCADE;
DROP TABLE IF EXISTS public.delay_risk_assessments CASCADE;
DROP TABLE IF EXISTS public.road_twin_snapshots CASCADE;
DROP TABLE IF EXISTS public.permit_approval_records CASCADE;
DROP TABLE IF EXISTS public.permit_approvals CASCADE;
DROP TABLE IF EXISTS public.emergency_incidents CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.work_updates CASCADE;
DROP TABLE IF EXISTS public.signal_fusion_cases CASCADE;
DROP TABLE IF EXISTS public.closure_proof_packages CASCADE;
DROP TABLE IF EXISTS public.payment_milestones CASCADE;
DROP TABLE IF EXISTS public.citizen_completion_feedback CASCADE;
DROP TABLE IF EXISTS public.permit_action_audit_logs CASCADE;
DROP TABLE IF EXISTS public.public_verification_events CASCADE;
DROP TABLE IF EXISTS public.field_capture_drafts CASCADE;
DROP TABLE IF EXISTS public.fleet_camera_events CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.road_passports CASCADE;

-- 0.1 Clean up storage triggers if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

create extension if not exists pgcrypto;
create extension if not exists postgis;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    city,
    is_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'citizen'),
    coalesce(new.raw_user_meta_data->>'city', 'Indore'),
    true
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'citizen',
  department text,
  phone text,
  city text not null default 'Indore',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.road_segments (
  id uuid primary key default gen_random_uuid(),
  road_id text unique not null,
  name text not null,
  city text not null,
  ward text,
  zone text,
  length_km numeric(10,2),
  width_m numeric(10,2),
  surface_type text not null default 'bitumen',
  last_paved_date date,
  avg_daily_traffic integer,
  heavy_vehicle_percentage integer,
  health_score integer not null default 100,
  total_defects integer not null default 0,
  last_health_update timestamptz,
  location jsonb,
  geom geometry(geometry, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utility_organizations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text not null,
  contact_email text,
  contact_phone text,
  portal_access_enabled boolean not null default true,
  color_hex text not null default '#1f4f8c',
  icon text not null default '⚡',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_configurations (
  id uuid primary key default gen_random_uuid(),
  config_key text unique not null,
  module text not null,
  display_name text not null,
  description text,
  system_prompt text not null,
  model_provider text not null default 'google',
  model_name text not null,
  temperature numeric(4,2) not null default 0.2,
  max_tokens integer not null default 2000,
  parameters jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  previous_prompts jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_locked boolean not null default false,
  last_tested_at timestamptz,
  test_result jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  road_segment_id uuid references public.road_segments(id) on delete cascade,
  defect_type text not null,
  severity text not null,
  confidence numeric(5,4),
  source text,
  status text not null default 'open',
  photo_url text,
  location jsonb,
  geom geometry(point, 4326),
  area_sqm numeric(10,2),
  description text,
  ai_analysis jsonb,
  repair_priority text,
  estimated_cost_inr numeric(12,2),
  reported_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.health_predictions (
  id uuid primary key default gen_random_uuid(),
  road_segment_id uuid references public.road_segments(id) on delete cascade,
  health_score integer not null,
  predicted_failure_date date,
  months_remaining integer,
  risk_level text,
  deterioration_rate numeric(6,2),
  risk_factors jsonb not null default '[]'::jsonb,
  recommendation text,
  maintenance_schedule jsonb not null default '[]'::jsonb,
  budget_estimate_inr numeric(15,2),
  confidence numeric(5,4),
  ai_provider text,
  ai_model_version text,
  raw_ai_response jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.excavation_bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_code text unique not null,
  road_name text not null,
  permit_count integer not null default 0,
  recommended_start date,
  recommended_end date,
  preferred_time_slot text,
  traffic_impact_score numeric(8,2),
  disruption_days integer,
  rationale text,
  coordination_dept text,
  cost_savings_inr numeric(15,2),
  delay_probability numeric(6,4),
  permits text[] not null default '{}'::text[],
  recommended_window text,
  emergency_protocol text,
  notification_plan text,
  qr_board_url text,
  ai_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.excavation_permits (
  id uuid primary key default gen_random_uuid(),
  permit_number text unique not null default ('PERMIT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  organization text not null,
  contact_name text,
  contact_phone text,
  purpose text not null,
  road_segment_id uuid references public.road_segments(id),
  road_name text,
  location_description text,
  requested_start_date date not null,
  requested_end_date date not null,
  depth_m numeric(6,2) not null,
  width_m numeric(6,2),
  status text not null default 'pending',
  urgency text not null default 'normal',
  bundle_id uuid references public.excavation_bundles(id) on delete set null,
  ai_optimization jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null default ('CMP-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))),
  complaint_text text not null,
  language text,
  road_segment_id uuid references public.road_segments(id) on delete set null,
  road_name text,
  location jsonb,
  latitude numeric(10,7),
  longitude numeric(10,7),
  photo_url text,
  image_url text,
  status text not null default 'open',
  priority text not null default 'medium',
  urgency_score integer,
  defect_type text,
  sentiment text,
  keywords text[] not null default '{}'::text[],
  response_time_hours integer,
  population_impact integer,
  ai_analysis jsonb,
  ai_provider text,
  confidence numeric(5,4),
  citizen_id uuid references public.profiles(id) on delete set null,
  citizen_name text,
  citizen_phone text,
  assigned_org_id uuid references public.utility_organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  config_key text,
  model_provider text,
  model_name text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.road_image_surveys (
  id uuid primary key default gen_random_uuid(),
  title text,
  road_segment_id uuid references public.road_segments(id) on delete set null,
  road_name text,
  lat_center numeric(10,7) not null,
  lng_center numeric(10,7) not null,
  geom geometry(point, 4326),
  photo_url text not null,
  ai_health_score numeric(5,2),
  ai_condition text,
  ai_defects jsonb not null default '[]'::jsonb,
  ai_confidence numeric(5,4),
  uploaded_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utility_infrastructure (
  id uuid primary key default gen_random_uuid(),
  utility_org_id uuid references public.utility_organizations(id) on delete cascade,
  road_segment_id uuid references public.road_segments(id) on delete set null,
  road_name text not null,
  utility_type text not null,
  infra_type text default 'line_asset',
  status text not null default 'active',
  depth_min_m numeric(6,3),
  depth_max_m numeric(6,3),
  depth_avg_m numeric(6,3) not null default 0,
  diameter_mm integer,
  material text,
  installation_date date,
  spec_value text,
  safety_score integer,
  is_abandoned boolean not null default false,
  condition text not null default 'good',
  condition_score integer,
  risk_level text,
  last_inspection_date timestamptz,
  start_location jsonb,
  end_location jsonb,
  geom geometry(linestring, 4326),
  photo_url text,
  photo_urls text[] not null default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utility_conflict_zones (
  id uuid primary key default gen_random_uuid(),
  infra_id_1 uuid references public.utility_infrastructure(id) on delete cascade,
  infra_id_2 uuid references public.utility_infrastructure(id) on delete cascade,
  conflict_type text not null,
  risk_level text not null,
  location jsonb,
  geom geometry(point, 4326),
  notes text,
  detected_at timestamptz not null default now()
);

create table if not exists public.public_worksites (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references public.excavation_permits(id) on delete set null,
  permit_number text unique not null,
  road_name text not null,
  ward text,
  zone text,
  location jsonb,
  purpose text not null,
  department text not null,
  contractor text not null,
  status text not null default 'planned',
  progress_percent integer not null default 0,
  requested_start_date date,
  requested_end_date date,
  estimated_completion date,
  budget_inr numeric(15,2),
  traffic_impact_score integer,
  delay_probability numeric(6,4),
  delay_reason text,
  detour text,
  qr_verified boolean not null default false,
  blockchain_hash text,
  contact_name text,
  contact_phone text,
  subscriber_count integer not null default 0,
  citizen_rating numeric(4,2),
  closure_type text,
  photo_urls text[] not null default '{}'::text[],
  photo_timeline jsonb not null default '[]'::jsonb,
  archive_ready boolean not null default false,
  updates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid references public.public_worksites(id) on delete cascade,
  permit_number text not null,
  road_name text not null,
  ward text not null,
  subscriber_name text not null,
  subscriber_phone text not null,
  channel text not null,
  language text not null default 'Hindi + English',
  radius_m integer not null default 500,
  source text not null default 'public_portal',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (permit_number, subscriber_phone, channel)
);

create table if not exists public.route_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_name text not null,
  subscriber_phone text not null,
  channel text not null,
  language text not null default 'Hindi + English',
  ward text not null,
  route_name text not null,
  city text not null default 'Indore',
  commute_window text not null default '08:00 - 10:00',
  source text not null default 'public_portal',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (route_name, ward, subscriber_phone, channel)
);

create table if not exists public.smart_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'medium',
  channel text not null,
  audience text not null,
  status text not null default 'draft',
  road_name text not null,
  ward text not null,
  scheduled_for timestamptz not null,
  radius_m integer not null default 500,
  related_permit_number text,
  detour text,
  language text not null default 'Hindi + English',
  created_at timestamptz not null default now()
);

create table if not exists public.traffic_advisories (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null,
  road_name text not null,
  ward text not null,
  affected_routes text[] not null default '{}'::text[],
  estimated_delay_minutes integer not null default 0,
  disruption_score integer not null default 0,
  closure_window text not null,
  detour text not null,
  police_notified boolean not null default false,
  fleet_notified boolean not null default false,
  citizen_notice_status text not null default 'draft',
  event_watch text,
  recommended_window text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citizen_champions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ward text not null,
  points integer not null default 0,
  badge text,
  validated_reports integer not null default 0,
  streak_days integer not null default 0,
  recent_win text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ward_leaderboard (
  ward text primary key,
  total_points integer not null default 0,
  validated_reports integer not null default 0,
  fix_rate_percent numeric(5,2) not null default 0,
  top_badge text,
  updated_at timestamptz not null default now()
);

create table if not exists public.civic_reward_rules (
  id uuid primary key default gen_random_uuid(),
  action text unique not null,
  points integer not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contractor_scorecards (
  id uuid primary key default gen_random_uuid(),
  contractor text unique not null,
  active_projects integer not null default 0,
  completed_projects integer not null default 0,
  on_time_rate_percent numeric(5,2) not null default 0,
  closure_evidence_rate_percent numeric(5,2) not null default 0,
  citizen_rating numeric(4,2) not null default 0,
  repeat_dig_penalties integer not null default 0,
  safety_incidents integer not null default 0,
  coordination_score numeric(5,2) not null default 0,
  delay_risk numeric(6,4) not null default 0,
  last_audit_at timestamptz,
  public_grade text not null default 'B',
  watchlist boolean not null default false,
  strongest_metric text,
  risk_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delay_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  permit_number text unique not null,
  road_name text not null,
  ward text not null,
  contractor text not null,
  delay_probability numeric(6,4) not null default 0,
  suggested_buffer_days integer not null default 0,
  risk_factors text[] not null default '{}'::text[],
  required_sign_off text not null default 'none',
  escalation_status text not null default 'monitoring',
  public_completion_date date not null,
  last_reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.road_twin_snapshots (
  id uuid primary key default gen_random_uuid(),
  road_segment_id uuid references public.road_segments(id) on delete cascade,
  snapshot_year integer not null,
  health_score integer not null,
  defect_count integer not null default 0,
  visible_utilities integer not null default 0,
  active_workzones integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (road_segment_id, snapshot_year)
);

create table if not exists public.permit_approval_records (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references public.excavation_permits(id) on delete cascade,
  permit_number text unique not null,
  road_name text not null,
  purpose text not null,
  emergency boolean not null default false,
  road_protection_rule boolean not null default false,
  status text not null default 'under_review',
  required_signatures integer not null default 0,
  collected_signatures integer not null default 0,
  blockchain_hash text,
  qr_code_url text,
  public_verification_url text,
  compliance_flags text[] not null default '{}'::text[],
  post_audit_due timestamptz,
  closure_state text not null default 'pending',
  closure_evidence jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_incidents (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null,
  road_name text not null,
  ward text not null,
  incident_type text not null,
  protocol text not null,
  severity text not null,
  status text not null default 'new',
  summary text not null,
  triggered_at timestamptz not null default now(),
  response_sla_minutes integer not null default 120,
  affected_radius_m integer not null default 500,
  diversion_route text not null,
  field_language text not null default 'Hindi',
  nearest_utilities jsonb not null default '[]'::jsonb,
  notified_departments text[] not null default '{}'::text[],
  permit_approval_id uuid references public.permit_approval_records(id) on delete set null,
  post_audit_due timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  title text not null,
  road_name text not null,
  ward text not null,
  source text not null,
  source_id text not null,
  priority text not null default 'medium',
  status text not null default 'queued',
  assigned_department text not null,
  assigned_crew text not null,
  due_by timestamptz not null,
  estimated_cost_inr numeric(15,2) not null default 0,
  bilingual_summary jsonb not null default '{}'::jsonb,
  permit_number text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_fusion_cases (
  id uuid primary key default gen_random_uuid(),
  road_name text not null,
  ward text not null,
  defect_focus text not null,
  citizen_reports_48h integer not null default 0,
  total_citizen_reports integer not null default 0,
  fleet_hits integer not null default 0,
  survey_hits integer not null default 0,
  field_hits integer not null default 0,
  severity text not null default 'medium',
  confidence_score numeric(5,4) not null default 0.25,
  auto_escalated boolean not null default false,
  validation_status text not null default 'monitoring',
  linked_work_order_id uuid references public.work_orders(id) on delete set null,
  source_mix text[] not null default '{}'::text[],
  summary text not null,
  recommended_action text not null,
  engineer_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.closure_proof_packages (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid references public.public_worksites(id) on delete cascade,
  permit_number text not null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  road_name text not null,
  ward text not null,
  contractor text not null,
  status text not null default 'collecting',
  before_count integer not null default 0,
  during_count integer not null default 0,
  after_count integer not null default 0,
  geo_tag_coverage_percent integer not null default 0,
  utility_depth_verified boolean not null default false,
  surface_reinstatement_score integer not null default 0,
  payout_completion_percent integer not null default 0,
  engineer_sign_off text,
  payment_hold_reason text,
  proof_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_milestones (
  id uuid primary key default gen_random_uuid(),
  closure_proof_id uuid references public.closure_proof_packages(id) on delete cascade,
  permit_number text not null,
  label text not null,
  amount_inr numeric(15,2) not null default 0,
  due_on date not null,
  status text not null default 'pending',
  released_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citizen_completion_feedback (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null,
  road_name text not null,
  ward text not null,
  citizen_name text not null,
  rating integer not null check (rating between 1 and 5),
  feedback text not null,
  photo_url text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permit_action_audit_logs (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null,
  road_name text not null,
  entity_type text not null,
  entity_id text not null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  details text not null,
  immutable_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_verification_events (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null,
  road_name text not null,
  ward text not null,
  source text not null,
  outcome text not null default 'verified',
  viewer_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_capture_drafts (
  id uuid primary key default gen_random_uuid(),
  workflow text not null,
  title text not null,
  road_name text not null,
  ward text not null,
  operator_name text not null,
  language text not null default 'Hindi',
  voice_note_text text,
  summary text not null,
  photo_count integer not null default 1,
  permit_number text,
  emergency_type text,
  status text not null default 'queued_offline',
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  captured_at timestamptz not null default now(),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fleet_camera_events (
  id uuid primary key default gen_random_uuid(),
  partner text not null,
  route_name text not null,
  camera_id text not null,
  event_type text not null,
  severity text not null,
  confidence numeric(5,4) not null,
  captured_at timestamptz not null,
  road_name text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_department on public.profiles(department);
create index if not exists idx_road_segments_name on public.road_segments(name);
create index if not exists idx_defects_road_segment on public.defects(road_segment_id, created_at desc);
create index if not exists idx_defects_status on public.defects(status);
create index if not exists idx_health_predictions_segment on public.health_predictions(road_segment_id, created_at desc);
create index if not exists idx_excavation_permits_status on public.excavation_permits(status, requested_start_date);
create index if not exists idx_excavation_permits_org on public.excavation_permits(organization);
create index if not exists idx_excavation_bundles_code on public.excavation_bundles(bundle_code);
create index if not exists idx_complaints_ticket on public.complaints(ticket_number);
create index if not exists idx_complaints_status on public.complaints(status, created_at desc);
create index if not exists idx_complaints_assigned_org on public.complaints(assigned_org_id);
create index if not exists idx_ai_usage_logs_module on public.ai_usage_logs(module, created_at desc);
create index if not exists idx_road_image_surveys_segment on public.road_image_surveys(road_segment_id, created_at desc);
create index if not exists idx_utility_org_code on public.utility_organizations(code);
create index if not exists idx_utility_infrastructure_org on public.utility_infrastructure(utility_org_id);
create index if not exists idx_utility_infrastructure_road on public.utility_infrastructure(road_name);
create index if not exists idx_utility_conflict_risk on public.utility_conflict_zones(risk_level, detected_at desc);
create index if not exists idx_public_worksites_permit on public.public_worksites(permit_number);
create index if not exists idx_notifications_schedule on public.smart_notifications(scheduled_for desc);
create index if not exists idx_notification_subscriptions_worksite on public.notification_subscriptions(worksite_id, created_at desc);
create index if not exists idx_route_alert_subscriptions_route on public.route_alert_subscriptions(route_name, ward, created_at desc);
create index if not exists idx_traffic_advisories_status on public.traffic_advisories(status, disruption_score desc);
create index if not exists idx_contractor_scorecards_grade on public.contractor_scorecards(public_grade, watchlist);
create index if not exists idx_delay_risk_assessments_probability on public.delay_risk_assessments(delay_probability desc, escalation_status);
create index if not exists idx_road_twin_snapshots_segment on public.road_twin_snapshots(road_segment_id, snapshot_year desc);
create index if not exists idx_permit_approval_records_permit on public.permit_approval_records(permit_id);
create index if not exists idx_emergency_incidents_status on public.emergency_incidents(status, severity, triggered_at desc);
create index if not exists idx_work_orders_status on public.work_orders(status, priority, due_by);
create index if not exists idx_signal_fusion_cases_status on public.signal_fusion_cases(validation_status, severity, last_seen_at desc);
create index if not exists idx_closure_proof_packages_status on public.closure_proof_packages(status, contractor, updated_at desc);
create index if not exists idx_payment_milestones_proof on public.payment_milestones(closure_proof_id, status, due_on);
create index if not exists idx_citizen_completion_feedback_permit on public.citizen_completion_feedback(permit_number, submitted_at desc);
create index if not exists idx_permit_action_audit_logs_permit on public.permit_action_audit_logs(permit_number, created_at desc);
create index if not exists idx_public_verification_events_permit on public.public_verification_events(permit_number, created_at desc);
create index if not exists idx_field_capture_drafts_status on public.field_capture_drafts(status, workflow, captured_at desc);
create index if not exists idx_fleet_camera_events_road on public.fleet_camera_events(road_name, captured_at desc);

create index if not exists idx_road_segments_geom on public.road_segments using gist (geom);
create index if not exists idx_defects_geom on public.defects using gist (geom);
create index if not exists idx_road_image_surveys_geom on public.road_image_surveys using gist (geom);
create index if not exists idx_utility_infrastructure_geom on public.utility_infrastructure using gist (geom);
create index if not exists idx_utility_conflict_geom on public.utility_conflict_zones using gist (geom);

create or replace function public.set_survey_geom()
returns trigger
language plpgsql
as $$
begin
  new.geom = st_setsrid(st_makepoint(new.lng_center, new.lat_center), 4326);
  return new;
end;
$$;

drop trigger if exists survey_set_geom on public.road_image_surveys;
create trigger survey_set_geom
before insert or update on public.road_image_surveys
for each row execute function public.set_survey_geom();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_road_segments_updated_at on public.road_segments;
create trigger set_road_segments_updated_at
before update on public.road_segments
for each row execute function public.set_updated_at();

drop trigger if exists set_ai_configurations_updated_at on public.ai_configurations;
create trigger set_ai_configurations_updated_at
before update on public.ai_configurations
for each row execute function public.set_updated_at();

drop trigger if exists set_excavation_bundles_updated_at on public.excavation_bundles;
create trigger set_excavation_bundles_updated_at
before update on public.excavation_bundles
for each row execute function public.set_updated_at();

drop trigger if exists set_excavation_permits_updated_at on public.excavation_permits;
create trigger set_excavation_permits_updated_at
before update on public.excavation_permits
for each row execute function public.set_updated_at();

drop trigger if exists set_complaints_updated_at on public.complaints;
create trigger set_complaints_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();

drop trigger if exists set_road_image_surveys_updated_at on public.road_image_surveys;
create trigger set_road_image_surveys_updated_at
before update on public.road_image_surveys
for each row execute function public.set_updated_at();

drop trigger if exists set_utility_organizations_updated_at on public.utility_organizations;
create trigger set_utility_organizations_updated_at
before update on public.utility_organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_utility_infrastructure_updated_at on public.utility_infrastructure;
create trigger set_utility_infrastructure_updated_at
before update on public.utility_infrastructure
for each row execute function public.set_updated_at();

drop trigger if exists set_public_worksites_updated_at on public.public_worksites;
create trigger set_public_worksites_updated_at
before update on public.public_worksites
for each row execute function public.set_updated_at();

drop trigger if exists set_traffic_advisories_updated_at on public.traffic_advisories;
create trigger set_traffic_advisories_updated_at
before update on public.traffic_advisories
for each row execute function public.set_updated_at();

drop trigger if exists set_citizen_champions_updated_at on public.citizen_champions;
create trigger set_citizen_champions_updated_at
before update on public.citizen_champions
for each row execute function public.set_updated_at();

drop trigger if exists set_ward_leaderboard_updated_at on public.ward_leaderboard;
create trigger set_ward_leaderboard_updated_at
before update on public.ward_leaderboard
for each row execute function public.set_updated_at();

drop trigger if exists set_contractor_scorecards_updated_at on public.contractor_scorecards;
create trigger set_contractor_scorecards_updated_at
before update on public.contractor_scorecards
for each row execute function public.set_updated_at();

drop trigger if exists set_delay_risk_assessments_updated_at on public.delay_risk_assessments;
create trigger set_delay_risk_assessments_updated_at
before update on public.delay_risk_assessments
for each row execute function public.set_updated_at();

drop trigger if exists set_permit_approval_records_updated_at on public.permit_approval_records;
create trigger set_permit_approval_records_updated_at
before update on public.permit_approval_records
for each row execute function public.set_updated_at();

drop trigger if exists set_emergency_incidents_updated_at on public.emergency_incidents;
create trigger set_emergency_incidents_updated_at
before update on public.emergency_incidents
for each row execute function public.set_updated_at();

drop trigger if exists set_work_orders_updated_at on public.work_orders;
create trigger set_work_orders_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_signal_fusion_cases_updated_at on public.signal_fusion_cases;
create trigger set_signal_fusion_cases_updated_at
before update on public.signal_fusion_cases
for each row execute function public.set_updated_at();

drop trigger if exists set_closure_proof_packages_updated_at on public.closure_proof_packages;
create trigger set_closure_proof_packages_updated_at
before update on public.closure_proof_packages
for each row execute function public.set_updated_at();

drop trigger if exists set_payment_milestones_updated_at on public.payment_milestones;
create trigger set_payment_milestones_updated_at
before update on public.payment_milestones
for each row execute function public.set_updated_at();

drop trigger if exists set_citizen_completion_feedback_updated_at on public.citizen_completion_feedback;
create trigger set_citizen_completion_feedback_updated_at
before update on public.citizen_completion_feedback
for each row execute function public.set_updated_at();

drop trigger if exists set_permit_action_audit_logs_updated_at on public.permit_action_audit_logs;
create trigger set_permit_action_audit_logs_updated_at
before update on public.permit_action_audit_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_public_verification_events_updated_at on public.public_verification_events;
create trigger set_public_verification_events_updated_at
before update on public.public_verification_events
for each row execute function public.set_updated_at();

drop trigger if exists set_field_capture_drafts_updated_at on public.field_capture_drafts;
create trigger set_field_capture_drafts_updated_at
before update on public.field_capture_drafts
for each row execute function public.set_updated_at();

alter table public.profiles disable row level security;
alter table public.road_segments disable row level security;
alter table public.utility_organizations disable row level security;
alter table public.ai_configurations disable row level security;
alter table public.defects disable row level security;
alter table public.health_predictions disable row level security;
alter table public.excavation_bundles disable row level security;
alter table public.excavation_permits disable row level security;
alter table public.complaints disable row level security;
alter table public.ai_usage_logs disable row level security;
alter table public.road_image_surveys disable row level security;
alter table public.utility_infrastructure disable row level security;
alter table public.utility_conflict_zones disable row level security;
alter table public.public_worksites disable row level security;
alter table public.notification_subscriptions disable row level security;
alter table public.route_alert_subscriptions disable row level security;
alter table public.smart_notifications disable row level security;
alter table public.traffic_advisories disable row level security;
alter table public.citizen_champions disable row level security;
alter table public.ward_leaderboard disable row level security;
alter table public.civic_reward_rules disable row level security;
alter table public.contractor_scorecards disable row level security;
alter table public.delay_risk_assessments disable row level security;
alter table public.road_twin_snapshots disable row level security;
alter table public.permit_approval_records disable row level security;
alter table public.emergency_incidents disable row level security;
alter table public.work_orders disable row level security;
alter table public.signal_fusion_cases disable row level security;
alter table public.closure_proof_packages disable row level security;
alter table public.payment_milestones disable row level security;
alter table public.citizen_completion_feedback disable row level security;
alter table public.permit_action_audit_logs disable row level security;
alter table public.public_verification_events disable row level security;
alter table public.field_capture_drafts disable row level security;
alter table public.fleet_camera_events disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'name'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'public'
  ) then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values
        ('road-images', 'road-images', true),
        ('defect-photos', 'defect-photos', true),
        ('complaint-photos', 'complaint-photos', true)
      on conflict (id) do nothing
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'public'
  ) then
    execute $sql$
      insert into storage.buckets (id, public)
      values
        ('road-images', true),
        ('defect-photos', true),
        ('complaint-photos', true)
      on conflict (id) do nothing
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'name'
  ) then
    execute $sql$
      insert into storage.buckets (id, name)
      values
        ('road-images', 'road-images'),
        ('defect-photos', 'defect-photos'),
        ('complaint-photos', 'complaint-photos')
      on conflict (id) do nothing
    $sql$;
  else
    execute $sql$
      insert into storage.buckets (id)
      values
        ('road-images'),
        ('defect-photos'),
        ('complaint-photos')
      on conflict (id) do nothing
    $sql$;
  end if;
end $$;

drop policy if exists "RoadTwin public media read" on storage.objects;
drop policy if exists "RoadTwin auth media upload" on storage.objects;

create policy "RoadTwin public media read"
on storage.objects
for select
using (bucket_id in ('road-images', 'defect-photos', 'complaint-photos'));

create policy "RoadTwin auth media upload"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('road-images', 'defect-photos', 'complaint-photos'));

insert into public.ai_configurations (
  config_key,
  module,
  display_name,
  description,
  system_prompt,
  model_provider,
  model_name,
  temperature,
  max_tokens,
  parameters,
  is_active,
  is_locked
)
values
  (
    'pothole_detection',
    'pothole',
    'Road Defect Vision Analysis',
    'Detect potholes and surface defects from road imagery.',
    'You are a municipal road-inspection AI. Analyze road images for potholes, cracks, water logging, and surface failures for Indian city roads. Return structured JSON only.',
    'google',
    'gemini-2.0-flash',
    0.2,
    2000,
    '{"mode":"vision"}'::jsonb,
    true,
    false
  ),
  (
    'road_health_prediction',
    'prediction',
    'Road Failure Forecast',
    'Forecast road health degradation and recommend maintenance actions.',
    'You are a municipal pavement analytics AI. Predict deterioration, risk, and maintenance strategy using road condition and defect history. Return structured JSON only.',
    'google',
    'gemini-2.0-flash',
    0.2,
    2000,
    '{"forecast_horizon_months":12}'::jsonb,
    true,
    false
  ),
  (
    'excavation_optimizer',
    'excavation',
    'Excavation Coordination Optimizer',
    'Bundle permits to reduce repeated digging and public disruption.',
    'You are a road coordination AI for Indian municipalities. Group overlapping excavations, minimize traffic impact, and recommend bundled windows. Return structured JSON only.',
    'google',
    'gemini-2.0-flash',
    0.2,
    2200,
    '{"peak_hours":["08:00-10:00","18:00-20:00"],"preferred_window":"22:00-06:00","bundling_radius_meters":500}'::jsonb,
    true,
    false
  ),
  (
    'complaint_prioritization',
    'complaint',
    'Citizen Complaint Prioritization',
    'Analyze multilingual complaints and assign urgency plus routing.',
    'You are a civic complaint triage AI. Read citizen complaints, identify urgency, likely defect type, and department routing for Indian municipal road operations. Return structured JSON only.',
    'google',
    'gemini-2.0-flash',
    0.2,
    1800,
    '{"routing":"municipal"}'::jsonb,
    true,
    false
  ),
  (
    'road_survey_assistant',
    'road_survey',
    'Road Survey Assistant',
    'Support field image survey interpretation.',
    'You are a field survey AI assistant for municipal road inspection. Help interpret uploaded survey imagery and summarize likely road condition findings.',
    'google',
    'gemini-2.0-flash',
    0.2,
    1800,
    '{}'::jsonb,
    true,
    false
  ),
  (
    'global_ops',
    'global',
    'Global Operations Defaults',
    'Shared app-wide AI defaults.',
    'You are the shared AI baseline for RoadTwin civic workflows.',
    'google',
    'gemini-2.0-flash',
    0.2,
    1500,
    '{}'::jsonb,
    true,
    false
  )
on conflict (config_key) do update
set
  module = excluded.module,
  display_name = excluded.display_name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  model_provider = excluded.model_provider,
  model_name = excluded.model_name,
  temperature = excluded.temperature,
  max_tokens = excluded.max_tokens,
  parameters = excluded.parameters,
  is_active = excluded.is_active,
  is_locked = excluded.is_locked,
  updated_at = now();
