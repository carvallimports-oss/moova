-- Moova Camada 2+ — Gestão de Locação, Assinatura Eletrônica, Análise de Crédito

-- ── RENTAL CONTRACTS (Contratos de Locação) ───────────────────────────────
create table public.rental_contracts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  property_id       uuid references public.properties(id) on delete set null,
  landlord_id       uuid references public.landlord_profiles(id) on delete set null,
  -- Tenant
  tenant_name       text not null,
  tenant_cpf        text,
  tenant_phone      text,
  tenant_email      text,
  -- Contract terms
  rent_value        numeric(12,2) not null,
  admin_fee_pct     numeric(5,2) not null default 10.00, -- taxa de administração %
  iptu_monthly      numeric(10,2) default 0,
  condominium       numeric(10,2) default 0,
  guarantee_type    text check (guarantee_type in ('caucao','fianca','seguro_fianca','titulo_capitalizacao')),
  start_date        date not null,
  end_date          date,
  duration_months   int not null default 30,
  reajuste_index    text not null default 'igpm' check (reajuste_index in ('igpm','ipca','incc','fixo')),
  payment_day       int not null default 5 check (payment_day between 1 and 28),
  -- Status
  status            text not null default 'vigente'
                    check (status in ('rascunho','vigente','encerrado','inadimplente','rescindido')),
  address           text,
  notes             text,
  -- Asaas integration
  asaas_subscription_id text,
  -- D4Sign integration
  d4sign_document_key   text,
  signed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.rental_contracts enable row level security;
create policy "users own rental contracts" on public.rental_contracts for all using (auth.uid() = user_id);
create trigger set_updated_at_rental before update on public.rental_contracts
  for each row execute function public.set_updated_at();
create index idx_rental_user on public.rental_contracts(user_id, status);

-- ── RENTAL CHARGES (Cobranças mensais) ────────────────────────────────────
create table public.rental_charges (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.rental_contracts(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  reference_month date not null,
  rent_value      numeric(12,2) not null,
  iptu_value      numeric(10,2) not null default 0,
  condominium     numeric(10,2) not null default 0,
  fine_value      numeric(10,2) not null default 0,
  total_value     numeric(12,2) not null,
  status          text not null default 'pendente'
                  check (status in ('pendente','pago','atrasado','cancelado')),
  due_date        date not null,
  paid_at         timestamptz,
  asaas_payment_id text,
  boleto_url      text,
  pix_code        text,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.rental_charges enable row level security;
create policy "users own rental charges" on public.rental_charges for all using (auth.uid() = user_id);
create index idx_charges_contract on public.rental_charges(contract_id);
create index idx_charges_user_status on public.rental_charges(user_id, status);

-- ── RENTAL PAYOUTS (Repasses ao proprietário) ─────────────────────────────
create table public.rental_payouts (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.rental_contracts(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  charge_id       uuid references public.rental_charges(id) on delete set null,
  reference_month date not null,
  gross_value     numeric(12,2) not null,
  admin_fee       numeric(10,2) not null,
  net_value       numeric(12,2) not null,
  status          text not null default 'pendente'
                  check (status in ('pendente','pago','cancelado')),
  paid_at         timestamptz,
  payment_method  text,
  receipt_url     text,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.rental_payouts enable row level security;
create policy "users own rental payouts" on public.rental_payouts for all using (auth.uid() = user_id);
create index idx_payouts_contract on public.rental_payouts(contract_id);

-- ── SIGNATURE DOCUMENTS (Assinatura Eletrônica — D4Sign) ──────────────────
create table public.signature_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  contract_id      uuid references public.rental_contracts(id) on delete set null,
  title            text not null,
  document_type    text not null check (document_type in ('contrato_locacao','contrato_compra_venda','proposta','distrato','vistoria','outro')),
  d4sign_uuid      text,
  d4sign_safe_uuid text,
  status           text not null default 'rascunho'
                   check (status in ('rascunho','aguardando','parcial','assinado','cancelado','expirado')),
  signatories      jsonb not null default '[]',
  file_url         text,
  signed_file_url  text,
  sent_at          timestamptz,
  completed_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.signature_documents enable row level security;
create policy "users own signature docs" on public.signature_documents for all using (auth.uid() = user_id);
create trigger set_updated_at_sigdocs before update on public.signature_documents
  for each row execute function public.set_updated_at();
create index idx_sigdocs_user on public.signature_documents(user_id, status);

-- ── CREDIT ANALYSES (Análise de Crédito para inquilinos) ──────────────────
create table public.credit_analyses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  contract_id     uuid references public.rental_contracts(id) on delete set null,
  -- Subject
  subject_name    text not null,
  subject_cpf     text not null,
  subject_type    text not null default 'inquilino' check (subject_type in ('inquilino','fiador','comprador')),
  -- Income & capacity
  monthly_income  numeric(12,2),
  rent_requested  numeric(12,2),
  income_ratio    numeric(5,2), -- rent/income %
  -- Score & verdict
  score           int check (score between 0 and 1000),
  score_source    text default 'serasa',
  verdict         text check (verdict in ('aprovado','aprovado_com_ressalvas','reprovado','pendente')),
  risk_level      text check (risk_level in ('baixo','medio','alto','critico')),
  -- AI analysis
  ai_summary      text,
  ai_flags        jsonb not null default '[]',
  -- Metadata
  consulted_at    timestamptz not null default now(),
  valid_until     timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.credit_analyses enable row level security;
create policy "users own credit analyses" on public.credit_analyses for all using (auth.uid() = user_id);
create index idx_credit_user on public.credit_analyses(user_id);

-- ── NEWSLETTER LOGS (Cora me Conta — rastreamento) ────────────────────────
create table public.newsletter_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  edition_date    date not null,
  subject         text,
  content_html    text,
  sent_at         timestamptz not null default now(),
  opened_at       timestamptz,
  total_recipients int not null default 0
);

alter table public.newsletter_logs enable row level security;
create policy "users own newsletter logs" on public.newsletter_logs for all using (auth.uid() = user_id);
create index idx_newsletter_user on public.newsletter_logs(user_id, edition_date);
