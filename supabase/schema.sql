-- WatchKITA Supabase schema
--
-- Apply this in the Supabase SQL editor (or `supabase db push`).
-- Both tables are server-only: Row Level Security is enabled with NO policies,
-- so the anon/authenticated keys cannot read them. The backend uses the
-- service_role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- 1. Catalog response cache
--    Stores normalized Watchmode payloads so repeat page views do not spend
--    the plan's request quota. The server also keeps a short-lived memory
--    cache in front of this table.
-- ---------------------------------------------------------------------------
create table if not exists public.api_cache (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists api_cache_expires_at_idx
  on public.api_cache (expires_at);

alter table public.api_cache enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Watchlist items
--    Device-scoped copy of the browser watchlist. The browser remains the
--    source of truth; this table lets a deployment keep a durable copy.
--    This is not a user account system.
-- ---------------------------------------------------------------------------
create table if not exists public.watchlist_items (
  device_id uuid not null,
  title_id bigint not null,
  title text not null,
  year integer,
  title_type text not null
    check (title_type in ('movie', 'tv_series', 'tv_special', 'tv_miniseries', 'tv_movie', 'short_film')),
  poster text,
  created_at timestamptz not null default now(),
  primary key (device_id, title_id)
);

create index if not exists watchlist_items_device_idx
  on public.watchlist_items (device_id, created_at desc);

alter table public.watchlist_items enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Optional housekeeping
--    Expired cache rows are cleaned opportunistically by the server. You can
--    also schedule this function with pg_cron if it is enabled.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_api_cache()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.api_cache where expires_at < now();
$$;

revoke all on function public.purge_expired_api_cache() from public, anon, authenticated;
