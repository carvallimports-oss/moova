-- Moova Camada 2 — C2.1 (Moova Inteligência) + C2.2 (Moova Maestria)
-- Tabelas: legal_consultations, negotiation_sessions, extra_services,
--          inspections_support, property_estimates

-- ── LEGAL CONSULTATIONS (Cora me Defende) ─────────────────────────────────
create table public.legal_consultations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  question   text not null,
  answer     text not null,
  disclaimer text not null default 'Esta orientação é informativa e NÃO substitui consulta com advogado habilitado. Para casos específicos, procure um profissional.',
  category   text check (category in ('contrato','distrato','locacao','despejo','iptu','itbi','geral')),
  created_at timestamptz not null default now()
);

alter table public.legal_consultations enable row level security;
create policy "users own legal consultations" on public.legal_consultations for all using (auth.uid() = user_id);
create index idx_legal_user on public.legal_consultations(user_id);

-- ── NEGOTIATION SESSIONS (Cora me Treina) ─────────────────────────────────
create table public.negotiation_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete set null,
  context     text not null,
  briefing    text not null,
  meeting_at  timestamptz,
  outcome     text check (outcome in ('fechou','nao_fechou','em_negociacao','reagendou')),
  created_at  timestamptz not null default now()
);

alter table public.negotiation_sessions enable row level security;
create policy "users own negotiation sessions" on public.negotiation_sessions for all using (auth.uid() = user_id);
create index idx_neg_sessions_user on public.negotiation_sessions(user_id);

-- ── EXTRA SERVICES (Serviços Extras) ──────────────────────────────────────
create table public.extra_services (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10,2),
  status       text not null default 'pending'
               check (status in ('pending','in_progress','completed','cancelled')),
  client_name  text,
  client_phone text,
  due_date     date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.extra_services enable row level security;
create policy "users own extra services" on public.extra_services for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.extra_services
  for each row execute function public.set_updated_at();
create index idx_extra_services_user on public.extra_services(user_id, status);

-- ── INSPECTIONS SUPPORT (Moova Vistoria de apoio) ─────────────────────────
create table public.inspections_support (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  property_id     uuid references public.properties(id) on delete set null,
  address         text,
  status          text not null default 'draft'
                  check (status in ('draft','processing','ready','delivered')),
  report_json     jsonb not null default '{}',
  report_url      text,
  price_charged   numeric(10,2),
  inspector_notes text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.inspections_support enable row level security;
create policy "users own inspections" on public.inspections_support for all using (auth.uid() = user_id);
create trigger set_updated_at_inspections before update on public.inspections_support
  for each row execute function public.set_updated_at();
create index idx_inspections_user on public.inspections_support(user_id);

-- ── PROPERTY ESTIMATES (Moova Estimativa / CMA) ────────────────────────────
create table public.property_estimates (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  property_id      uuid references public.properties(id) on delete set null,
  address          text,
  city             text,
  state            text,
  property_type    text,
  area_sqm         numeric,
  bedrooms         int,
  price_min        numeric,
  price_max        numeric,
  price_suggested  numeric,
  comparables      jsonb not null default '[]',
  margin_of_error  numeric,
  disclaimer       text not null default 'Esta estimativa é informativa e não constitui avaliação imobiliária formal (NBR 14.653). Para validade legal, consulte profissional habilitado pelo CFC ou CRECI.',
  created_at       timestamptz not null default now()
);

alter table public.property_estimates enable row level security;
create policy "users own estimates" on public.property_estimates for all using (auth.uid() = user_id);
create index idx_estimates_user on public.property_estimates(user_id);
