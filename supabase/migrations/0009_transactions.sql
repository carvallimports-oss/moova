-- ── TRANSACTIONS (fechamentos reais de comissão) ─────────────────────────────
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  description text not null,
  commission numeric not null check (commission > 0),
  closed_at date not null,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "users own transactions" on public.transactions for all using (auth.uid() = user_id);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_closed_at on public.transactions(closed_at);

-- Trigger: atualiza commission_achieved no pacto_moova_90_audit ao inserir/deletar transação
create or replace function public.sync_pacto_commission()
returns trigger language plpgsql as $$
declare
  v_user_id uuid;
  v_total numeric;
  v_pacto_id uuid;
begin
  v_user_id := coalesce(NEW.user_id, OLD.user_id);

  select id into v_pacto_id
  from public.pacto_moova_90_audit
  where user_id = v_user_id
    and resolved_at is null
  order by created_at desc
  limit 1;

  if v_pacto_id is null then
    return coalesce(NEW, OLD);
  end if;

  select coalesce(sum(commission), 0) into v_total
  from public.transactions
  where user_id = v_user_id
    and closed_at >= (select date(started_at) from public.pacto_moova_90_audit where id = v_pacto_id);

  update public.pacto_moova_90_audit
  set commission_achieved = v_total
  where id = v_pacto_id;

  return coalesce(NEW, OLD);
end;
$$;

create trigger sync_pacto_commission_insert
  after insert on public.transactions
  for each row execute function public.sync_pacto_commission();

create trigger sync_pacto_commission_delete
  after delete on public.transactions
  for each row execute function public.sync_pacto_commission();
