-- LGPD: campo para rastrear solicitação de exclusão de dados do lead
alter table public.leads
  add column if not exists lgpd_deletion_requested_at timestamptz;

create index if not exists idx_leads_lgpd_deletion
  on public.leads(lgpd_deletion_requested_at)
  where lgpd_deletion_requested_at is not null;

-- Storage bucket para comprovantes de venda (KYC M01)
-- Criado via SQL para rastrear em migration (bucket precisa existir no Supabase Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-proofs',
  'sale-proofs',
  false,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- RLS: apenas o próprio corretor pode acessar seu comprovante
create policy "broker uploads own sale proof"
  on storage.objects for insert
  with check (bucket_id = 'sale-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "broker reads own sale proof"
  on storage.objects for select
  using (bucket_id = 'sale-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
