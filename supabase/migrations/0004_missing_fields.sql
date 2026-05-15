-- Camada 1 — campos faltantes detectados na auditoria

-- USERS: broker_name (nome profissional), CPF, ElevenLabs voice, sale proof, human approval categories
alter table public.users
  add column if not exists broker_name text,
  add column if not exists cpf text,
  add column if not exists eleven_labs_voice_id text,
  add column if not exists sale_proof_url text,
  add column if not exists human_approval_categories jsonb not null default '{"visita":true,"valor":true,"contraproposta":true,"fechamento":true,"alto_valor":true}'::jsonb;

-- Sync broker_name from name for existing rows
update public.users set broker_name = name where broker_name is null;

-- VISITS: status, notes, address, reminder flags
alter table public.visits
  add column if not exists status text not null default 'pendente' check (status in ('pendente','confirmada','cancelada','realizada')),
  add column if not exists notes text,
  add column if not exists address text,
  add column if not exists reminder_24h_sent boolean not null default false,
  add column if not exists follow_up_sent boolean not null default false;

-- LEADS: last_message_at for recency tracking
alter table public.leads
  add column if not exists last_message_at timestamptz;

-- Index para lookup por telefone (crítico para process-message)
create index if not exists idx_leads_user_phone on public.leads(user_id, phone);
create index if not exists idx_wa_accounts_instance on public.whatsapp_accounts(instance_name);

-- Cap de 30 corretores simultâneos: view para contar diagnósticos ativos
create or replace view public.diagnostico_cap_check as
  select count(*) as active_count
  from public.diagnostico_cora_14d
  where converted_to_subscription = false
    and ends_at > now();
