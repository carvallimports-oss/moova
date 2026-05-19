-- Moova Camada 2 — Fase C2.0 (Moova Opera)
-- Tabelas: landlord_profiles, property_media, social_posts_drafts/published,
--          portal_listings, module_adoption_metrics, ia_cost_per_client,
--          upgrade_offers, diario_imovel_logs, downgrade_handled_events, pacto_maestria_audit

-- ── Expand subscriptions.plan ────────────────────────────────────────────────
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('evolution','bsp','opera','inteligencia','maestria'));

-- ── Add portal_slug + bio to users ──────────────────────────────────────────
alter table public.users
  add column if not exists portal_slug  text unique,
  add column if not exists bio          text,
  add column if not exists avatar_url   text,
  add column if not exists city         text,
  add column if not exists state_uf     text;

-- ── LANDLORD PROFILES (pipeline proprietário) ─────────────────────────────
create table public.landlord_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  name           text not null,
  phone          text,
  email          text,
  cpf            text,
  status         text not null default 'prospeccao'
                   check (status in ('prospeccao','em_contato','negociando_exclusividade',
                                     'captado','em_publicacao','vendido','retomado')),
  exclusivity    boolean not null default false,
  property_id    uuid references public.properties(id),
  notes          text,
  next_action    text,
  next_action_at timestamptz,
  origin         text check (origin in ('portal_moova','contato_existente','anuncio_publico','whatsapp_opt_in')),
  optin_at       timestamptz,
  optin_source   text,
  diario_optin   boolean not null default false,
  diario_contact text check (diario_contact in ('whatsapp','email')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.landlord_profiles enable row level security;
create policy "users own landlords" on public.landlord_profiles for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.landlord_profiles
  for each row execute function public.set_updated_at();
create index idx_landlord_user on public.landlord_profiles(user_id, status);

-- ── PROPERTY MEDIA ────────────────────────────────────────────────────────
create table public.property_media (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  type         text not null check (type in ('photo_original','photo_edited','video_reel','tour_360','description_ai')),
  url          text not null,
  storage_path text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

alter table public.property_media enable row level security;
create policy "users own property media" on public.property_media for all using (auth.uid() = user_id);
create index idx_media_property on public.property_media(property_id);

-- ── SOCIAL POSTS ─────────────────────────────────────────────────────────
create table public.social_posts_drafts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  property_id  uuid references public.properties(id) on delete set null,
  platform     text not null
                 check (platform in ('instagram_stories','instagram_feed','instagram_reels',
                                     'facebook_post','facebook_marketplace','tiktok_reels')),
  caption      text,
  media_url    text,
  status       text not null default 'pending'
                 check (status in ('pending','approved','rejected','published')),
  approved_at  timestamptz,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.social_posts_drafts enable row level security;
create policy "users own drafts" on public.social_posts_drafts for all using (auth.uid() = user_id);
create index idx_drafts_status on public.social_posts_drafts(user_id, status);

create table public.social_posts_published (
  id               uuid primary key default gen_random_uuid(),
  draft_id         uuid references public.social_posts_drafts(id),
  user_id          uuid not null references public.users(id) on delete cascade,
  platform         text not null,
  external_post_id text,
  published_at     timestamptz not null default now()
);

alter table public.social_posts_published enable row level security;
create policy "users own published posts" on public.social_posts_published for all using (auth.uid() = user_id);

-- ── PORTAL LISTINGS (integração unidirecional portais) ───────────────────
create table public.portal_listings (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  portal              text not null check (portal in ('zap','vivareal','imovelweb','chavesnamao','olx')),
  external_listing_id text,
  status              text not null default 'pending'
                        check (status in ('pending','active','error','removed')),
  last_synced_at      timestamptz,
  error_message       text,
  created_at          timestamptz not null default now(),
  unique (property_id, portal)
);

alter table public.portal_listings enable row level security;
create policy "users own portal listings" on public.portal_listings for all using (auth.uid() = user_id);

-- ── MODULE ADOPTION METRICS ──────────────────────────────────────────────
create table public.module_adoption_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  module       text not null,
  first_used_at timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  usage_count   int not null default 1,
  unique (user_id, module)
);

alter table public.module_adoption_metrics enable row level security;
create policy "users own adoption metrics" on public.module_adoption_metrics for all using (auth.uid() = user_id);

-- ── IA COST PER CLIENT ───────────────────────────────────────────────────
create table public.ia_cost_per_client (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  month      date not null,
  cost_brl   numeric(10,2) not null default 0,
  tokens_used int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.ia_cost_per_client enable row level security;
create policy "users own ia cost" on public.ia_cost_per_client for all using (auth.uid() = user_id);

-- ── UPGRADE OFFERS ────────────────────────────────────────────────────────
create table public.upgrade_offers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  from_plan    text not null,
  to_plan      text not null,
  sent_at      timestamptz not null default now(),
  responded_at timestamptz,
  response     text check (response in ('accepted','rejected','later')),
  sent_via     text not null default 'nara' check (sent_via in ('nara','dashboard','email'))
);

alter table public.upgrade_offers enable row level security;
create policy "users own upgrade offers" on public.upgrade_offers for all using (auth.uid() = user_id);

-- ── DIÁRIO DO IMÓVEL LOGS ─────────────────────────────────────────────────
create table public.diario_imovel_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  landlord_id     uuid references public.landlord_profiles(id) on delete set null,
  property_id     uuid references public.properties(id) on delete set null,
  sent_at         timestamptz not null default now(),
  opened_at       timestamptz,
  content_summary jsonb not null default '{}'
);

alter table public.diario_imovel_logs enable row level security;
create policy "users own diario logs" on public.diario_imovel_logs for all using (auth.uid() = user_id);

-- ── DOWNGRADE HANDLED EVENTS ─────────────────────────────────────────────
create table public.downgrade_handled_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  from_plan           text not null,
  to_plan             text not null,
  trigger_reason      text,
  human_contacted_at  timestamptz,
  resolution          text check (resolution in ('downgraded','kept_maestria','recovery_plan')),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.downgrade_handled_events enable row level security;
create policy "users own downgrade events" on public.downgrade_handled_events for all using (auth.uid() = user_id);

-- ── PACTO MAESTRIA AUDIT (C2.2 — schema antecipado) ─────────────────────
create table public.pacto_maestria_audit (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  subscription_id      uuid not null references public.subscriptions(id) on delete cascade,
  started_at           timestamptz not null,
  baseline_commission  numeric not null default 0,
  additional_commission numeric not null default 0,
  target_additional    numeric not null default 15000,
  months_evaluated     int not null default 0,
  status               text not null default 'active'
                         check (status in ('active','target_met','downgrade_triggered','recovery_plan')),
  resolved_at          timestamptz,
  created_at           timestamptz not null default now()
);

alter table public.pacto_maestria_audit enable row level security;
create policy "users own pacto maestria" on public.pacto_maestria_audit for all using (auth.uid() = user_id);
