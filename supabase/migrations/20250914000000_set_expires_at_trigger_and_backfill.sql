-- Migration: Set expires_at via trigger and backfill existing rows for noise_areas
-- Created: 2025-09-14

begin;

-- Function to set final_category (if missing) and expires_at on insert
create or replace function public.noise_areas_set_expiry()
returns trigger
language plpgsql
as $$
declare
  v_category noise_category_enum;
begin
  -- Keep provided expires_at if present
  if new.expires_at is not null then
    return new;
  end if;

  -- Determine final_category when not provided, based on noise_source
  if new.final_category is null then
    v_category := case
      when lower(coalesce(new.noise_source, '')) in ('event','events','concert','festival') then 'Event'::noise_category_enum
      when lower(coalesce(new.noise_source, '')) in ('construction','building','renovation') then 'Construction'::noise_category_enum
      when lower(coalesce(new.noise_source, '')) in ('traffic','road','vehicle','transport','car','motorcycle','bike') then 'Traffic'::noise_category_enum
      when lower(coalesce(new.noise_source, '')) in ('industry','factory','manufacture','industrial') then 'Industry'::noise_category_enum
      when lower(coalesce(new.noise_source, '')) in ('nature','animal','bird','rain','wind','thunder') then 'Nature'::noise_category_enum
      else 'Other'::noise_category_enum
    end;
    new.final_category := v_category;
  else
    v_category := new.final_category;
  end if;

  -- TTL mapping by final_category
  case v_category
    when 'Event'::noise_category_enum then new.expires_at := now() + interval '1 day';
    when 'Construction'::noise_category_enum then new.expires_at := now() + interval '14 days';
    when 'Traffic'::noise_category_enum then new.expires_at := now() + interval '3 days';
    when 'Industry'::noise_category_enum then new.expires_at := now() + interval '90 days';
    when 'Nature'::noise_category_enum then new.expires_at := now() + interval '7 days';
    else new.expires_at := now() + interval '7 days';
  end case;

  return new;
end;
$$;

-- Trigger installation
drop trigger if exists trg_noise_areas_set_expiry on public.noise_areas;
create trigger trg_noise_areas_set_expiry
before insert on public.noise_areas
for each row execute procedure public.noise_areas_set_expiry();

-- One-time backfill for existing rows with NULL expires_at
with derived as (
  select
    id,
    coalesce(
      final_category,
      case
        when lower(coalesce(noise_source, '')) in ('event','events','concert','festival') then 'Event'::noise_category_enum
        when lower(coalesce(noise_source, '')) in ('construction','building','renovation') then 'Construction'::noise_category_enum
        when lower(coalesce(noise_source, '')) in ('traffic','road','vehicle','transport','car','motorcycle','bike') then 'Traffic'::noise_category_enum
        when lower(coalesce(noise_source, '')) in ('industry','factory','manufacture','industrial') then 'Industry'::noise_category_enum
        when lower(coalesce(noise_source, '')) in ('nature','animal','bird','rain','wind','thunder') then 'Nature'::noise_category_enum
        else 'Other'::noise_category_enum
      end
    ) as cat
  from public.noise_areas
  where expires_at is null
)
update public.noise_areas na
set
  final_category = d.cat,
  expires_at = case d.cat
    when 'Event'::noise_category_enum then coalesce(na.created_at, now()) + interval '1 day'
    when 'Construction'::noise_category_enum then coalesce(na.created_at, now()) + interval '14 days'
    when 'Traffic'::noise_category_enum then coalesce(na.created_at, now()) + interval '3 days'
    when 'Industry'::noise_category_enum then coalesce(na.created_at, now()) + interval '90 days'
    when 'Nature'::noise_category_enum then coalesce(na.created_at, now()) + interval '7 days'
    else coalesce(na.created_at, now()) + interval '7 days'
  end
from derived d
where na.id = d.id;

-- Ensure index exists for efficient expiry queries
create index if not exists idx_noise_areas_expires_at on public.noise_areas (expires_at);

commit;