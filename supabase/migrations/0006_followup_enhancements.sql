-- Enhancements: 1h visit reminder, thinking followup, incident visibility

-- 1h reminder flag na visits
alter table public.visits
  add column if not exists reminder_1h_sent boolean not null default false;

-- Retomada 3 dias "vou pensar" — data agendada do follow-up
alter table public.leads
  add column if not exists thinking_followup_at timestamptz;

-- Índice para cron de thinking followup
create index if not exists idx_leads_thinking_followup on public.leads(thinking_followup_at)
  where thinking_followup_at is not null;

-- Incidentes legíveis por usuários autenticados (timeline no dashboard)
create policy "authenticated can read incidents" on public.fallback_incidents
  for select using (auth.uid() is not null);
