-- Noise Areas table to support sharing measured noise to the map
-- Migration: 20250123000000_create_noise_areas_table.sql

begin;

-- Ensure pgcrypto exists for gen_random_uuid()
create extension if not exists pgcrypto;

-- Table to store user-submitted noise areas (circles) shown on the map
create table if not exists public.noise_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude numeric(9,6) not null,         -- -90..90 (precision to ~0.11m)
  longitude numeric(9,6) not null,        -- -180..180
  noise_level numeric(6,2),               -- dB(A) average at the time of share
  noise_source text,                      -- top classification label
  health_impact public.health_status_enum, -- reuse existing enum from health schema
  description text,
  address text,
  radius integer not null default 100,    -- meters
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  -- Constraints
  constraint chk_latitude check (latitude between -90 and 90),
  constraint chk_longitude check (longitude between -180 and 180),
  constraint chk_radius_non_negative check (radius >= 0),
  constraint chk_noise_level_non_negative check (noise_level is null or noise_level >= 0)
);

-- Helpful indexes
create index if not exists idx_noise_areas_user_created on public.noise_areas(user_id, created_at desc);
create index if not exists idx_noise_areas_expires_at on public.noise_areas(expires_at);
create index if not exists idx_noise_areas_location on public.noise_areas(latitude, longitude);

-- Trigger: auto-update updated_at (reuses public.tg_set_timestamp from previous migration)
create trigger set_timestamp_noise_areas
before update on public.noise_areas
for each row execute function public.tg_set_timestamp();

-- Row Level Security
alter table public.noise_areas enable row level security;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "noise_areas_select_visible_auth" ON public.noise_areas;
DROP POLICY IF EXISTS "noise_areas_select_visible_anon" ON public.noise_areas;
DROP POLICY IF EXISTS "noise_areas_insert_own" ON public.noise_areas;
DROP POLICY IF EXISTS "noise_areas_update_own" ON public.noise_areas;
DROP POLICY IF EXISTS "noise_areas_delete_own" ON public.noise_areas;

-- Allow authenticated and anonymous users to read non-expired shared areas (for map display)
create policy "noise_areas_select_visible_auth" on public.noise_areas
  for select to authenticated
  using (expires_at is null or expires_at > now());

create policy "noise_areas_select_visible_anon" on public.noise_areas
  for select to anon
  using (expires_at is null or expires_at > now());

-- Owners can insert/update/delete their own rows
create policy "noise_areas_insert_own" on public.noise_areas
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "noise_areas_update_own" on public.noise_areas
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "noise_areas_delete_own" on public.noise_areas
  for delete to authenticated
  using (user_id = auth.uid());

commit;