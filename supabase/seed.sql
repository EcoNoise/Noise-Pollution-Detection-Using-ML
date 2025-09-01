-- Seed data for ecoNoise Noise Map Web
-- Run with: supabase db reset (local) or execute in SQL editor after migrations

begin;

-- Ensure required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Seed auth users (minimal fields). Use fixed UUIDs for referential integrity
-- NOTE: These are sample users for development/testing only
insert into auth.users (id, email, email_confirmed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', now()),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', now())
on conflict (id) do nothing;

-- 2) Seed profiles mapped to auth.users
insert into public.profiles (id, username, first_name, last_name, email, photo_url, status_aktif)
values
  ('11111111-1111-1111-1111-111111111111', 'alice', 'Alice', 'Anderson', 'alice@example.com', null, true),
  ('22222222-2222-2222-2222-222222222222', 'bob', 'Bob', 'Brown', 'bob@example.com','Bob123456' null, true)
on conflict (id) do nothing;

-- 3) Seed health analysis sessions (these will aggregate into daily metrics via triggers)
-- Create sessions for the past few days for Alice
insert into public.health_analysis_sessions (id, user_id, started_at, ended_at, duration_seconds, avg_db, avg_dba, health_impact)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (now() - interval '2 days')::timestamptz + interval '8 hours', (now() - interval '2 days')::timestamptz + interval '9 hours 15 minutes', 75*60, 68.50, 65.30, 'Perhatian'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (now() - interval '1 days')::timestamptz + interval '10 hours 30 minutes', (now() - interval '1 days')::timestamptz + interval '12 hours', 90*60, 72.10, 70.20, 'Berbahaya'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (now())::timestamptz + interval '7 hours 45 minutes', (now())::timestamptz + interval '8 hours 30 minutes', 45*60, 60.00, 58.50, 'Perhatian');

-- Create a couple sessions for Bob
insert into public.health_analysis_sessions (id, user_id, started_at, ended_at, duration_seconds, avg_db, avg_dba, health_impact)
values
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', (now() - interval '3 days')::timestamptz + interval '14 hours', (now() - interval '3 days')::timestamptz + interval '15 hours 30 minutes', 90*60, 55.20, 53.80, 'Aman'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', (now() - interval '1 days')::timestamptz + interval '9 hours', (now() - interval '1 days')::timestamptz + interval '9 hours 45 minutes', 45*60, 66.00, 63.50, 'Perhatian');

-- 4) Seed noise areas (shared to map)
insert into public.noise_areas (
  id, user_id, latitude, longitude, noise_level, noise_source, health_impact,
  description, address, radius, created_at, updated_at, expires_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', -6.200000, 106.816666, 72.50, 'Lalu lintas', 'Berbahaya', 'Dekat jalan utama, lalu lintas padat', 'Jakarta Pusat', 150, now() - interval '1 hour', now() - interval '1 hour', now() + interval '23 hours'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', -6.914744, 107.609810, 58.00, 'Percakapan', 'Perhatian', 'Area kampus relatif ramai', 'Bandung', 120, now() - interval '3 hours', now() - interval '3 hours', now() + interval '1 day'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', -7.250445, 112.768845, 65.30, 'Konstruksi', 'Perhatian', 'Pembangunan gedung berlangsung', 'Surabaya', 200, now() - interval '5 hours', now() - interval '5 hours', now() + interval '2 days');

commit;