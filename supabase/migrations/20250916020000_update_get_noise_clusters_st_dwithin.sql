-- Migration: Update get_noise_clusters() to use ST_DWithin + temporal proximity (<= 1 hour)
-- Purpose: Graph-based clustering (connected components) where edges connect reports within 30 meters and <= 1 hour apart
-- Notes:
-- - Uses geom geometry(Point, 4326)
-- - Leverages GiST functional index on (geom::geography) to accelerate ST_DWithin(..., 30)
-- - Transitive closure via recursive CTE label propagation to compute connected components
-- - Aggregation rules follow previous function semantics
-- Created: 2025-09-16

BEGIN;

-- Ensure a GiST index that supports geography distance checks
-- (the existing geometry GiST may not be used for geography casts)
CREATE INDEX IF NOT EXISTS noise_areas_geog_gist_idx
  ON public.noise_areas
  USING GIST ((geom::geography));

-- Replace previous function
DROP FUNCTION IF EXISTS public.get_noise_clusters();

CREATE OR REPLACE FUNCTION public.get_noise_clusters()
RETURNS TABLE (
  cluster_id uuid,
  latitude_avg double precision,
  longitude_avg double precision,
  noise_level_avg double precision,
  area_status text,
  final_category text,
  noise_sources text,
  first_created_at timestamptz,
  last_created_at timestamptz,
  max_expires_at timestamptz,
  added_by_usernames text[],
  report_count bigint,
  avg_confidence double precision
)
LANGUAGE sql
AS $$
WITH RECURSIVE
nodes AS (
  SELECT id, user_id, geom, created_at, expires_at,
         latitude, longitude, noise_level,
         status::text AS status,
         final_category::text AS final_category,
         noise_source,
         confidence_score
  FROM public.noise_areas
),
-- undirected edges between nodes that are within 30m spatially AND within 1 hour temporally
edges AS (
  SELECT n1.id AS a, n2.id AS b
  FROM nodes n1
  JOIN nodes n2 ON n1.id < n2.id
  WHERE ST_DWithin(n1.geom::geography, n2.geom::geography, 30)
    AND ABS(EXTRACT(EPOCH FROM (n1.created_at - n2.created_at))) <= 3600
),
undirected AS (
  SELECT a, b FROM edges
  UNION ALL
  SELECT b, a FROM edges
),
-- compute reachability from every node as a root; the canonical cluster_id is the minimal root that can reach the node
reach AS (
  SELECT id AS root, id
  FROM nodes
  UNION
  SELECT r.root, u.b
  FROM reach r
  JOIN undirected u ON u.a = r.id
  WHERE u.b <> r.root
),
labels AS (
  SELECT id, MIN(root::text)::uuid AS cluster_id
  FROM reach
  GROUP BY id
),
members AS (
  SELECT l.cluster_id, n.*
  FROM labels l
  JOIN nodes n ON n.id = l.id
),
agg AS (
  SELECT
    cluster_id,
    AVG(m.latitude)::double precision AS latitude_avg,
    AVG(m.longitude)::double precision AS longitude_avg,
    AVG(m.noise_level)::double precision AS noise_level_avg,
    CASE WHEN bool_or(m.status = 'Berisik') THEN 'Berisik' ELSE 'Aman' END AS area_status,
    CASE WHEN COUNT(DISTINCT m.final_category) FILTER (WHERE m.final_category IS NOT NULL) > 1 THEN 'Mixed'
         ELSE MIN(m.final_category) END AS final_category,
    array_to_string(array_agg(DISTINCT m.noise_source ORDER BY m.noise_source), ', ') AS noise_sources,
    MIN(m.created_at) AS first_created_at,
    MAX(m.created_at) AS last_created_at,
    MAX(m.expires_at) AS max_expires_at,
    array_agg(DISTINCT p.username ORDER BY p.username) AS added_by_usernames,
    COUNT(*)::bigint AS report_count,
    AVG(m.confidence_score)::double precision AS avg_confidence
  FROM members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  GROUP BY cluster_id
)
SELECT *
FROM agg
ORDER BY last_created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_noise_clusters() TO anon, authenticated;

COMMIT;