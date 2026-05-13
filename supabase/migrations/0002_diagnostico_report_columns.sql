-- Add completed_at alias and leads_contacted to diagnostico_cora_14d
alter table public.diagnostico_cora_14d
  add column if not exists completed_at timestamptz,
  add column if not exists leads_contacted int not null default 0;
