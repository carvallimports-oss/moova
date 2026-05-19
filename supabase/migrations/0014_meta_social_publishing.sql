-- Moova — Meta/Instagram Social Publishing
-- Adiciona tokens Meta nos users + campos de publicação nos drafts

-- ── USERS: Meta OAuth tokens ──────────────────────────────────────────────────
alter table public.users
  add column if not exists meta_access_token  text,
  add column if not exists meta_page_id        text,
  add column if not exists meta_page_name      text,
  add column if not exists meta_instagram_id   text,
  add column if not exists meta_token_expires_at timestamptz;

-- ── SOCIAL_POSTS_DRAFTS: campos de publicação ─────────────────────────────────
alter table public.social_posts_drafts
  add column if not exists published_meta_id text,
  add column if not exists published_at      timestamptz,
  add column if not exists publish_error     text;
