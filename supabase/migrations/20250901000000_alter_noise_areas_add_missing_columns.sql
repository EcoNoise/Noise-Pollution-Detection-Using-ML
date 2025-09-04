-- Migration: Add missing columns to public.noise_areas based on map.md schema
-- Note: Existing column "noise_level" in DB serves the same purpose as "noise_level_db" in the markdown.

begin;

-- 1) Create enums if they don't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'noise_category_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.noise_category_enum AS ENUM ('Traffic', 'Construction', 'Industry', 'Event', 'Nature', 'Other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'noise_area_status_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.noise_area_status_enum AS ENUM ('active', 'expiring', 'expired', 'permanent');
  END IF;
END $$;

-- 2) Add columns if not exists
ALTER TABLE public.noise_areas
  ADD COLUMN IF NOT EXISTS raw_labels jsonb,
  ADD COLUMN IF NOT EXISTS final_category public.noise_category_enum,
  ADD COLUMN IF NOT EXISTS confidence_score double precision,
  ADD COLUMN IF NOT EXISTS status public.noise_area_status_enum NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS validation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cluster_id uuid;

-- 3) Optional constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'noise_areas_confidence_score_range'
  ) THEN
    ALTER TABLE public.noise_areas
      ADD CONSTRAINT noise_areas_confidence_score_range
      CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));
  END IF;
END $$;

-- 4) Helpful indexes for query performance
CREATE INDEX IF NOT EXISTS idx_noise_areas_status ON public.noise_areas (status);
CREATE INDEX IF NOT EXISTS idx_noise_areas_final_category ON public.noise_areas (final_category);
CREATE INDEX IF NOT EXISTS idx_noise_areas_expires_at ON public.noise_areas (expires_at);
CREATE INDEX IF NOT EXISTS idx_noise_areas_cluster_id ON public.noise_areas (cluster_id);

-- 5) Documentation comments
COMMENT ON COLUMN public.noise_areas.raw_labels IS 'Full YAMNet classification outputs (e.g., ["car horn:0.82","engine:0.75"]).';
COMMENT ON COLUMN public.noise_areas.final_category IS 'Primary mapped category derived from raw_labels.';
COMMENT ON COLUMN public.noise_areas.confidence_score IS 'Highest YAMNet confidence score (0–1).';
COMMENT ON COLUMN public.noise_areas.status IS 'Report status per expiry policy (maintained by app/cron).';
COMMENT ON COLUMN public.noise_areas.validation_count IS 'Number of community validations ("masih ada").';
COMMENT ON COLUMN public.noise_areas.report_count IS 'Number of spam/incorrect reports.';
COMMENT ON COLUMN public.noise_areas.cluster_id IS 'Cluster identifier when merged into a noise cluster.';

commit;