alter table public.diagnostico_cora_14d
  add column if not exists share_token text unique;

create index if not exists idx_diagnostico_share_token on public.diagnostico_cora_14d(share_token);

-- Allow public read via share_token (no auth required)
create policy "public share token read" on public.diagnostico_cora_14d
  for select using (share_token is not null);
