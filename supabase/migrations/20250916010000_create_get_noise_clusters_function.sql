-- Migration: Create function get_noise_clusters()
-- Purpose: On-demand clustering by grid (ROUND(lat,4)/ROUND(lng,4)) and time bucket (hour)
-- Returns: Aggregated metrics and attributes as requested
-- Created: 2025-09-16

BEGIN;

-- Drop if exists to keep idempotent
DROP FUNCTION IF EXISTS public.get_noise_clusters();

CREATE OR REPLACE FUNCTION public.get_noise_clusters()
RETURNS TABLE (
  grid_lat numeric,
  grid_lng numeric,
  time_bucket timestamptz,
  latitude_avg double precision,
  longitude_avg double precision,
  noise_level_avg double precision,
  area_status text,
  final_category text,
  noise_sources text,
  last_created_at timestamptz,
  max_expires_at timestamptz,
  added_by_usernames text[],
  report_count bigint,
  avg_confidence double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(na.latitude, 4) AS grid_lat,
    ROUND(na.longitude, 4) AS grid_lng,
    date_trunc('hour', na.created_at) AS time_bucket,
    AVG(na.latitude)::double precision AS latitude_avg,
    AVG(na.longitude)::double precision AS longitude_avg,
    AVG(na.noise_level)::double precision AS noise_level_avg,
    CASE WHEN bool_or(na.status::text = 'Berisik') THEN 'Berisik' ELSE 'Aman' END AS area_status,
    CASE
      WHEN COUNT(DISTINCT na.final_category) FILTER (WHERE na.final_category IS NOT NULL) > 1 THEN 'Mixed'
      ELSE MIN(na.final_category::text)
    END AS final_category,
    -- unique, sorted sources concatenated
    array_to_string(array_agg(DISTINCT na.noise_source ORDER BY na.noise_source), ', ') AS noise_sources,
    MAX(na.created_at) AS last_created_at,
    MAX(na.expires_at) AS max_expires_at,
    array_agg(DISTINCT p.username ORDER BY p.username) AS added_by_usernames,
    COUNT(*) AS report_count,
    AVG(na.confidence_score)::double precision AS avg_confidence
  FROM public.noise_areas na
  LEFT JOIN public.profiles p ON p.id = na.user_id
  GROUP BY
    ROUND(na.latitude, 4),
    ROUND(na.longitude, 4),
    date_trunc('hour', na.created_at)
  ORDER BY time_bucket DESC, grid_lat, grid_lng;
END;
$$;

-- Grant execute so frontend roles can call it via PostgREST
GRANT EXECUTE ON FUNCTION public.get_noise_clusters() TO anon, authenticated;

COMMIT;