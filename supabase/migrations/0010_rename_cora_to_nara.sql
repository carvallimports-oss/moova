-- Rename AI assistant from "Cora" to "Nara" (trademark conflict avoidance)

-- ── USERS: rename cora_* columns ──────────────────────────────────────────────
alter table public.users rename column cora_formality to nara_formality;
alter table public.users rename column cora_custom_prompt to nara_custom_prompt;
alter table public.users rename column cora_work_start to nara_work_start;
alter table public.users rename column cora_work_end to nara_work_end;

-- ── MESSAGES: update sender enum value ────────────────────────────────────────
alter table public.messages drop constraint if exists messages_sender_check;
update public.messages set sender = 'nara' where sender = 'cora';
alter table public.messages add constraint messages_sender_check
  check (sender in ('lead', 'nara', 'corretor'));

-- ── DIAGNOSTICO: rename tables ────────────────────────────────────────────────
alter table public.diagnostico_cora_marcos rename to diagnostico_nara_marcos;
alter table public.diagnostico_cora_14d rename to diagnostico_nara_14d;

-- Update foreign key reference (renamed automatically by Postgres, but make explicit)
-- The FK on diagnostico_nara_marcos.diagnostico_id now points to diagnostico_nara_14d

-- ── RLS POLICIES: recreate with new table names ───────────────────────────────
drop policy if exists "users own diagnostico" on public.diagnostico_nara_14d;
create policy "users own diagnostico" on public.diagnostico_nara_14d
  for all using (auth.uid() = user_id);

drop policy if exists "public share token read" on public.diagnostico_nara_14d;
create policy "public share token read" on public.diagnostico_nara_14d
  for select using (share_token is not null);

drop policy if exists "users own marcos 14d" on public.diagnostico_nara_marcos;
create policy "users own marcos 14d" on public.diagnostico_nara_marcos
  for all using (auth.uid() = user_id);
