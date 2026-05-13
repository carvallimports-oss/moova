-- Moova MVP — Schema inicial
-- Todas as tabelas com Row Level Security (RLS)

-- ── EXTENSÕES ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── USERS (corretores) ───────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  creci text not null,
  creci_state text not null,
  creci_validated_at timestamptz,
  creci_validation_status text not null default 'pending' check (creci_validation_status in ('pending','manual_review','validated','rejected')),
  phone text not null,
  whatsapp_provider text not null default 'evolution' check (whatsapp_provider in ('evolution','bsp')),
  cora_formality text not null default 'informal' check (cora_formality in ('formal','informal')),
  cora_custom_prompt text,
  human_approval_active boolean not null default true,
  human_approval_disabled_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "users can read own data" on public.users for select using (auth.uid() = id);
create policy "users can update own data" on public.users for update using (auth.uid() = id);

-- ── WHATSAPP ACCOUNTS ────────────────────────────────────────────────────────
create table public.whatsapp_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'evolution',
  instance_name text,
  phone_number text,
  status text not null default 'disconnected' check (status in ('connected','disconnected','qr_pending')),
  connected_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_accounts enable row level security;
create policy "users own whatsapp accounts" on public.whatsapp_accounts for all using (auth.uid() = user_id);

-- ── LEADS ────────────────────────────────────────────────────────────────────
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  status text not null default 'novo' check (status in ('novo','qualificado','em_consideracao','visita_agendada','visitou','em_negociacao','fechou','perdido')),
  temperature text check (temperature in ('QUENTE','MORNO','FRIO','INERTE')),
  estimated_budget numeric,
  region text,
  property_type text,
  funnel_stage text,
  last_contact_at timestamptz,
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;
create policy "users own leads" on public.leads for all using (auth.uid() = user_id);

-- ── PROPERTIES (imóveis) ─────────────────────────────────────────────────────
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  price numeric,
  address text,
  city text,
  state text,
  type text, -- apartamento, casa, comercial...
  bedrooms int,
  area_sqm numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties enable row level security;
create policy "users own properties" on public.properties for all using (auth.uid() = user_id);

-- ── CONVERSATIONS ────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  is_active boolean not null default true,
  broker_took_over boolean not null default false,
  broker_took_over_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
create policy "users own conversations" on public.conversations for all using (auth.uid() = user_id);

-- ── MESSAGES ─────────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  type text not null default 'text' check (type in ('text','audio','image')),
  sender text not null check (sender in ('lead','cora','corretor')),
  flags text[] not null default '{}',
  requires_approval boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
create policy "users own messages" on public.messages for all using (auth.uid() = user_id);

-- ── VISITS ───────────────────────────────────────────────────────────────────
create table public.visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_id uuid references public.properties(id),
  scheduled_at timestamptz not null,
  confirmed boolean not null default false,
  completed boolean not null default false,
  google_event_id text,
  created_at timestamptz not null default now()
);

alter table public.visits enable row level security;
create policy "users own visits" on public.visits for all using (auth.uid() = user_id);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null default 'evolution' check (plan in ('evolution','bsp')),
  price_brl numeric not null,
  status text not null default 'trial' check (status in ('trial','active','suspended','cancelled')),
  asaas_subscription_id text,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  activated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "users own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);

-- ── DIAGNOSTICO CORA 14D ─────────────────────────────────────────────────────
create table public.diagnostico_cora_14d (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '14 days'),
  leads_attended int not null default 0,
  cold_leads_reactivated int not null default 0,
  visits_scheduled int not null default 0,
  estimated_commission numeric not null default 0,
  report_generated_at timestamptz,
  report_shared boolean not null default false,
  converted_to_subscription boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.diagnostico_cora_14d enable row level security;
create policy "users own diagnostico" on public.diagnostico_cora_14d for all using (auth.uid() = user_id);

-- ── DIAGNOSTICO MARCOS (dias 3, 7, 11, 14) ───────────────────────────────────
create table public.diagnostico_cora_marcos (
  id uuid primary key default uuid_generate_v4(),
  diagnostico_id uuid not null references public.diagnostico_cora_14d(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  day_number int not null check (day_number in (3,7,11,14)),
  sent_at timestamptz,
  message_content text,
  created_at timestamptz not null default now(),
  unique (diagnostico_id, day_number)
);

alter table public.diagnostico_cora_marcos enable row level security;
create policy "users own marcos 14d" on public.diagnostico_cora_marcos for all using (auth.uid() = user_id);

-- ── PACTO MOOVA 90 ───────────────────────────────────────────────────────────
create table public.pacto_moova_90_audit (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  commission_achieved numeric not null default 0,
  visits_confirmed_pct numeric not null default 0,
  escalations_4h_pct numeric not null default 0,
  hot_leads_accepted_pct numeric not null default 0,
  good_faith_score numeric not null default 0,
  scenario text check (scenario in ('A','B','C','D')),
  refund_amount numeric,
  resolved_at timestamptz,
  contested_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pacto_moova_90_audit enable row level security;
create policy "users own pacto" on public.pacto_moova_90_audit for all using (auth.uid() = user_id);

-- ── PACTO MARCOS (dias 30, 45, 75, 90) ───────────────────────────────────────
create table public.pacto_moova_90_marcos (
  id uuid primary key default uuid_generate_v4(),
  pacto_id uuid not null references public.pacto_moova_90_audit(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  day_number int not null check (day_number in (30,45,75,90)),
  sent_at timestamptz,
  message_content text,
  created_at timestamptz not null default now(),
  unique (pacto_id, day_number)
);

alter table public.pacto_moova_90_marcos enable row level security;
create policy "users own marcos 90d" on public.pacto_moova_90_marcos for all using (auth.uid() = user_id);

-- ── FALLBACK INCIDENTS ───────────────────────────────────────────────────────
create table public.fallback_incidents (
  id uuid primary key default uuid_generate_v4(),
  openai_status text not null,
  anthropic_status text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  affected_conversations int not null default 0,
  created_at timestamptz not null default now()
);

-- Sem RLS — apenas service role escreve
alter table public.fallback_incidents enable row level security;

-- ── HUMAN APPROVALS QUEUE ────────────────────────────────────────────────────
create table public.human_approvals_queue (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  category text not null, -- 'visita','valor','contraproposta','fechamento','alto_valor'
  expires_at timestamptz not null default (now() + interval '1 hour'),
  resolved_at timestamptz,
  approved boolean,
  created_at timestamptz not null default now()
);

alter table public.human_approvals_queue enable row level security;
create policy "users own approval queue" on public.human_approvals_queue for all using (auth.uid() = user_id);

-- ── COMPLIANCE CONSENTS ───────────────────────────────────────────────────────
create table public.compliance_consents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  lead_phone text,
  type text not null check (type in ('broker_terms','broker_voice','lead_lgpd')),
  accepted_at timestamptz not null default now(),
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.compliance_consents enable row level security;
create policy "users own consents" on public.compliance_consents for all using (auth.uid() = user_id);

-- ── AUDIT LOGS (imutáveis, 5 anos) ───────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create policy "users read own audit logs" on public.audit_logs for select using (auth.uid() = user_id);
-- INSERT only via service role

-- ── CRECI VALIDATIONS ─────────────────────────────────────────────────────────
create table public.creci_validations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  creci text not null,
  state text not null,
  status text not null default 'pending' check (status in ('pending','valid','invalid','manual')),
  source text not null default 'scraping' check (source in ('scraping','manual','api')),
  validated_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.creci_validations enable row level security;
create policy "users own creci validations" on public.creci_validations for all using (auth.uid() = user_id);

-- ── UPDATED_AT trigger helper ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
