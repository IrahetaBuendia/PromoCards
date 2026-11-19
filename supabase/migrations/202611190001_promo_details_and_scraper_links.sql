alter table public.promos
  add column if not exists promo_details jsonb;

alter table public.scraper_runs
  add column if not exists workflow_job_url text;

-- The web and Android clients use the server-side API for catalog reads.
-- Administrative writes and scraper state stay behind the service role.
alter table public.promos enable row level security;
alter table public.scraper_runs enable row level security;
alter table public.scraper_triggers enable row level security;

revoke insert, update, delete, truncate on public.promos from anon, authenticated;
revoke all on public.scraper_runs, public.scraper_triggers from anon, authenticated;
