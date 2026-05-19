-- Moova Camada 2 — Captação opt-in + CMA Enterprise
-- Tabelas: captacao_optin_leads, cma_enterprise_requests
-- Coluna: users.cma_api_key

-- ── CAPTAÇÃO OPT-IN (Moova Captação) ──────────────────────────────────────
create table public.captacao_optin_leads (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  name              text        not null,
  phone             text,
  email             text,
  property_address  text,
  property_type     text        check (property_type in ('apartamento','casa','comercial','terreno','sala')),
  estimated_value   numeric,
  optin_source      text        not null default 'contato_existente'
                                check (optin_source in ('contato_existente','portal_moova','anuncio_publico','whatsapp_opt_in')),
  optin_confirmed   boolean     not null default false,
  status            text        not null default 'novo'
                                check (status in ('novo','qualificando','pitch_enviado','reuniao_agendada','captado','perdido')),
  pitch_content     text,
  pitch_sent_at     timestamptz,
  meeting_at        timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.captacao_optin_leads enable row level security;
create policy "users own captacao leads" on public.captacao_optin_leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_captacao_user_id on public.captacao_optin_leads(user_id);
create index idx_captacao_status   on public.captacao_optin_leads(status);

create trigger set_updated_at
  before update on public.captacao_optin_leads
  for each row execute function public.set_updated_at();

-- ── CMA API KEY (Moova Data / CMA Enterprise) ────────────────────────────
alter table public.users add column if not exists cma_api_key text unique default null;

-- ── CMA ENTERPRISE REQUESTS ───────────────────────────────────────────────
create table public.cma_enterprise_requests (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references public.users(id) on delete cascade,
  api_key_hash  text        not null,
  client_ref    text,
  address       text        not null,
  city          text        not null,
  state         text        not null,
  property_type text        not null,
  area_sqm      numeric     not null,
  result        jsonb       not null,
  created_at    timestamptz not null default now()
);

alter table public.cma_enterprise_requests enable row level security;
create policy "users own cma requests" on public.cma_enterprise_requests
  for all using (auth.uid() = user_id);
create index idx_cma_user    on public.cma_enterprise_requests(user_id);
create index idx_cma_api_key on public.cma_enterprise_requests(api_key_hash);
