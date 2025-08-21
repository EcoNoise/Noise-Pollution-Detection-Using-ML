-- Health Dashboard Schema for Supabase SQL Editor
-- Create tables, types, functions, triggers, and RLS policies to support
-- the Health Dashboard UI (Laporan Hari Ini, Ringkasan Mingguan, Peringatan, Rekomendasi)

begin;

-- Extensions (usually enabled by default on Supabase)
create extension if not exists pgcrypto;

-- Enum for health status to keep values consistent with UI
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'health_status_enum' and n.nspname = 'public') then
    create type public.health_status_enum as enum ('Aman', 'Perhatian', 'Berbahaya', 'Sangat Berbahaya');
  end if;
end $$;

-- Table: health_analysis_sessions (1 row per mic usage/session)
create table if not exists public.health_analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  avg_db numeric(6,2),
  avg_dba numeric(6,2),
  health_impact public.health_status_enum,
  created_at timestamptz not null default now()
);

create index if not exists idx_health_sessions_user_started on public.health_analysis_sessions(user_id, started_at);

-- Table: health_daily_metrics (aggregated per user per day)
create table if not exists public.health_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  total_analysis integer not null default 0,                -- berapa kali mic digunakan (jumlah sesi) pada hari tersebut
  total_exposure_seconds integer not null default 0,        -- total durasi monitoring (detik)
  average_noise_db numeric(6,2) not null default 0,         -- rata-rata dB
  average_noise_dba numeric(6,2) not null default 0,        -- rata-rata dB(A)
  health_status public.health_status_enum,                  -- status berdasarkan rata-rata harian
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, metric_date)
);

create index if not exists idx_health_daily_user_date on public.health_daily_metrics(user_id, metric_date);

-- Trigger to auto-update updated_at
create or replace function public.tg_set_timestamp() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger set_timestamp
before update on public.health_daily_metrics
for each row execute function public.tg_set_timestamp();

-- Function: evaluate health status from avg dBA
create or replace function public.evaluate_health_status(avg_dba numeric)
returns public.health_status_enum
language plpgsql
as $$
begin
  if avg_dba is null then
    return null;
  elsif avg_dba < 55 then
    return 'Aman';
  elsif avg_dba < 70 then
    return 'Perhatian';
  elsif avg_dba < 85 then
    return 'Berbahaya';
  else
    return 'Sangat Berbahaya';
  end if;
end;$$;

-- Upsert helper: aggregate a finished session into daily metrics
create or replace function public.upsert_health_daily_metrics(
  p_user_id uuid,
  p_date date,
  p_session_avg_db numeric,
  p_session_avg_dba numeric,
  p_session_duration_seconds integer
) returns void
language plpgsql
as $$
begin
  insert into public.health_daily_metrics as dm (
    user_id, metric_date, total_analysis, total_exposure_seconds,
    average_noise_db, average_noise_dba, health_status
  ) values (
    p_user_id, p_date, 1, coalesce(p_session_duration_seconds,0),
    coalesce(round(p_session_avg_db,2),0), coalesce(round(p_session_avg_dba,2),0),
    public.evaluate_health_status(coalesce(p_session_avg_dba,0))
  )
  on conflict (user_id, metric_date)
  do update set
    total_analysis = dm.total_analysis + 1,
    total_exposure_seconds = dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0),
    average_noise_db = case when dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0) > 0 then
      round(((dm.average_noise_db * dm.total_exposure_seconds) + (coalesce(p_session_avg_db,0) * coalesce(p_session_duration_seconds,0))) / (dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0)), 2)
    else dm.average_noise_db end,
    average_noise_dba = case when dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0) > 0 then
      round(((dm.average_noise_dba * dm.total_exposure_seconds) + (coalesce(p_session_avg_dba,0) * coalesce(p_session_duration_seconds,0))) / (dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0)), 2)
    else dm.average_noise_dba end,
    health_status = public.evaluate_health_status(
      case when dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0) > 0 then
        ((dm.average_noise_dba * dm.total_exposure_seconds) + (coalesce(p_session_avg_dba,0) * coalesce(p_session_duration_seconds,0))) / (dm.total_exposure_seconds + coalesce(p_session_duration_seconds,0))
      else dm.average_noise_dba end
    );
end;$$;

-- Trigger: when a session is finished, aggregate into daily metrics
create or replace function public.trg_health_session_to_daily()
returns trigger
language plpgsql
as $$
declare
  v_duration integer;
  v_date date;
begin
  if new.ended_at is null then
    return new; -- only aggregate when session finished
  end if;
  v_duration := coalesce(new.duration_seconds, 0);
  if v_duration = 0 then
    v_duration := greatest(0, floor(extract(epoch from (new.ended_at - new.started_at))));
  end if;
  v_date := (new.started_at at time zone 'utc')::date; -- normalize to UTC date

  perform public.upsert_health_daily_metrics(new.user_id, v_date, new.avg_db, new.avg_dba, v_duration);
  return new;
end;$$;

-- Attach trigger to sessions (after insert and after update of ended_at)
create trigger health_session_to_daily_after_ins
after insert on public.health_analysis_sessions
for each row when (new.ended_at is not null)
execute function public.trg_health_session_to_daily();

create trigger health_session_to_daily_after_upd
after update of ended_at, duration_seconds, avg_db, avg_dba on public.health_analysis_sessions
for each row when (new.ended_at is not null)
execute function public.trg_health_session_to_daily();

-- Helper: Today dashboard for a given user and date
create or replace function public.get_today_dashboard(
  p_user_id uuid,
  p_date date default (now() at time zone 'utc')::date
) returns table (
  total_analysis integer,
  average_noise numeric,
  health_status public.health_status_enum
)
language sql
stable
as $$
  select
    coalesce(dm.total_analysis, 0) as total_analysis,
    coalesce(dm.average_noise_dba, 0) as average_noise,
    dm.health_status
  from public.health_daily_metrics dm
  where dm.user_id = p_user_id and dm.metric_date = p_date;
$$;

-- Weekly summary (Mon-Sun) around target date
create or replace function public.get_weekly_audio_summary(
  p_user_id uuid,
  p_date date default (now() at time zone 'utc')::date
) returns table (
  day_index int,
  day_date date,
  total_analysis_hours numeric,
  average_noise_level numeric
)
language plpgsql
stable
as $$
declare
  v_start date := date_trunc('week', p_date)::date; -- Monday
  i int;
begin
  for i in 0..6 loop
    return query
    select
      i as day_index,
      (v_start + i) as day_date,
      coalesce(dm.total_exposure_seconds, 0) / 3600.0 as total_analysis_hours,
      coalesce(dm.average_noise_dba, 0) as average_noise_level
    from public.health_daily_metrics dm
    where dm.user_id = p_user_id and dm.metric_date = (v_start + i)
    union all
    select
      i as day_index,
      (v_start + i) as day_date,
      0::numeric as total_analysis_hours,
      0::numeric as average_noise_level
    where not exists (
      select 1 from public.health_daily_metrics dm2
      where dm2.user_id = p_user_id and dm2.metric_date = (v_start + i)
    )
    limit 1;
  end loop;
end;$$;

-- Alerts & Recommendations derived from weekly summary
create or replace function public.get_weekly_alerts_recommendations(
  p_user_id uuid,
  p_date date default (now() at time zone 'utc')::date
) returns jsonb
language plpgsql
stable
as $$
declare
  v_start date := date_trunc('week', p_date)::date;
  v_prev_start date := (date_trunc('week', p_date) - interval '7 days')::date;
  v_week_avg numeric;
  v_prev_week_avg numeric;
  v_long_exposure boolean;
  v_alerts text[] := array[]::text[];
  v_recos text[] := array[]::text[];
begin
  select avg(average_noise_dba) into v_week_avg
  from public.health_daily_metrics
  where user_id = p_user_id and metric_date between v_start and (v_start + 6);

  select avg(average_noise_dba) into v_prev_week_avg
  from public.health_daily_metrics
  where user_id = p_user_id and metric_date between v_prev_start and (v_prev_start + 6);

  select exists (
    select 1 from public.health_daily_metrics
    where user_id = p_user_id
      and metric_date between v_start and (v_start + 6)
      and total_exposure_seconds > 7200
      and average_noise_dba > 70
  ) into v_long_exposure;

  if coalesce(v_long_exposure, false) then
    v_alerts := array_append(v_alerts, 'Tingkat kebisingan di atas 70 dB selama lebih dari 2 jam pekan ini.');
  end if;

  if v_week_avg is not null and v_prev_week_avg is not null and v_week_avg > v_prev_week_avg then
    v_alerts := array_append(v_alerts, 'Rata-rata kebisingan pekan ini lebih tinggi dari pekan lalu.');
  end if;

  if coalesce(v_week_avg, 0) > 65 then
    v_recos := array_append(v_recos, 'Pertimbangkan menggunakan headphone noise-cancelling saat bekerja.');
  end if;

  if exists (
    select 1 from public.health_daily_metrics
    where user_id = p_user_id
      and metric_date between v_start and (v_start + 6)
      and total_exposure_seconds > 10800
  ) then
    v_recos := array_append(v_recos, 'Batasi paparan di area bising pada jam sibuk.');
  end if;

  return jsonb_build_object('alerts', coalesce(to_jsonb(v_alerts), '[]'::jsonb),
                            'recommendations', coalesce(to_jsonb(v_recos), '[]'::jsonb));
end;$$;

-- RLS Policies
alter table public.health_analysis_sessions enable row level security;
alter table public.health_daily_metrics enable row level security;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "sessions_select_own" ON public.health_analysis_sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON public.health_analysis_sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON public.health_analysis_sessions;
DROP POLICY IF EXISTS "sessions_delete_own" ON public.health_analysis_sessions;
DROP POLICY IF EXISTS "daily_select_own" ON public.health_daily_metrics;
DROP POLICY IF EXISTS "daily_insert_own" ON public.health_daily_metrics;
DROP POLICY IF EXISTS "daily_update_own" ON public.health_daily_metrics;

-- Sessions: users can CRUD their own rows
CREATE POLICY "sessions_select_own" ON public.health_analysis_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sessions_insert_own" ON public.health_analysis_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_update_own" ON public.health_analysis_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sessions_delete_own" ON public.health_analysis_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Daily metrics: users can read their own rows; writes happen via trigger, but allow upsert from client if needed
CREATE POLICY "daily_select_own" ON public.health_daily_metrics FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "daily_insert_own" ON public.health_daily_metrics FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_update_own" ON public.health_daily_metrics FOR UPDATE TO authenticated USING (user_id = auth.uid());

commit;