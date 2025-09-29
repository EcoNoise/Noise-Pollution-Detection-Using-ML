-- Migration: Create view with computed real-time status for noise_areas (Option A)
-- Created: 2025-09-15

begin;

-- Drop and recreate the view to ensure idempotency
DROP VIEW IF EXISTS public.noise_areas_with_status;

-- View that exposes all columns from noise_areas, but overrides `status` with a computed value,
-- and also exposes the original stored status as `db_status` for observability.
CREATE VIEW public.noise_areas_with_status AS
SELECT 
  na.id,
  na.user_id,
  na.latitude,
  na.longitude,
  na.noise_level,
  na.noise_source,
  na.health_impact,
  na.description,
  na.address,
  na.radius,
  na.created_at,
  na.updated_at,
  na.final_category,
  na.expires_at,
  -- Original status for debugging/analysis
  na.status AS db_status,
  -- Computed status according to map.md §4 rules
  (
    CASE 
      WHEN na.expires_at IS NULL THEN 'permanent'
      WHEN now() >= na.expires_at THEN 'expired'
      ELSE (
        CASE 
          WHEN EXTRACT(EPOCH FROM (na.expires_at - na.created_at)) <= 0 THEN 'expired'
          WHEN EXTRACT(EPOCH FROM (na.expires_at - now())) <= 0.2 * EXTRACT(EPOCH FROM (na.expires_at - na.created_at)) THEN 'expiring'
          ELSE 'active'
        END
      )
    END
  )::public.noise_area_status_enum AS status
FROM public.noise_areas na;

commit;