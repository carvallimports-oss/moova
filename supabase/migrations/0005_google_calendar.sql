alter table public.users
  add column if not exists google_calendar_connected boolean not null default false,
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_access_token text,
  add column if not exists google_calendar_token_expiry timestamptz,
  add column if not exists google_calendar_id text;
