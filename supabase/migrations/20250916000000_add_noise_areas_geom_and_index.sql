-- Migration: Add generated geom column and GiST index on noise_areas
-- Purpose: Keep geom always in sync with longitude/latitude and speed up spatial queries
-- Created: 2025-09-16

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

BEGIN;

-- 1) Add generated column `geom` as Point in SRID 4326
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'noise_areas'
      AND column_name = 'geom'
  ) THEN
    ALTER TABLE public.noise_areas
      ADD COLUMN geom geometry(Point, 4326)
      GENERATED ALWAYS AS (
        ST_SetSRID(
          ST_MakePoint(
            longitude::double precision,
            latitude::double precision
          ),
          4326
        )
      ) STORED;
  END IF;
END
$$;

-- 2) Create GiST index on geom for faster spatial search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'noise_areas_geom_gist_idx'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX noise_areas_geom_gist_idx
      ON public.noise_areas
      USING GIST (geom);
  END IF;
END
$$;

COMMIT;