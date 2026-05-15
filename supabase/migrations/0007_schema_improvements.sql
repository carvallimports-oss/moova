-- Schema improvements: operating hours, lead VIP, LGPD opt-out, reactivation sequence,
-- fix subscriptions table for Asaas webhook compatibility

-- ── USERS: horário de operação da Cora ────────────────────────────────────────
alter table public.users
  add column if not exists cora_work_start int not null default 8 check (cora_work_start between 0 and 23),
  add column if not exists cora_work_end   int not null default 20 check (cora_work_end between 0 and 23);

-- ── LEADS: VIP flag, LGPD opt-out, reactivation sequence ─────────────────────
alter table public.leads
  add column if not exists is_vip              boolean not null default false,
  add column if not exists lgpd_optout_at      timestamptz,
  add column if not exists reactivation_step   int not null default 0,
  add column if not exists reactivation_next_at timestamptz;

create index if not exists idx_leads_reactivation on public.leads(reactivation_next_at)
  where reactivation_step > 0;

create index if not exists idx_leads_vip on public.leads(user_id, is_vip)
  where is_vip = true;

-- ── SUBSCRIPTIONS: fix for Asaas webhook (add missing columns, expand enum) ──
-- Alter the status check to include 'past_due'
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
    check (status in ('trial','active','past_due','suspended','cancelled'));

-- Add missing columns referenced by Asaas webhook
alter table public.subscriptions
  add column if not exists asaas_customer_id  text,
  add column if not exists asaas_payment_id   text,
  add column if not exists current_period_end timestamptz,
  add column if not exists overdue_since      timestamptz;
