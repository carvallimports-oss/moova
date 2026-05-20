-- Moova — Storage bucket para property-media (fotos upload direto no Estúdio)

-- Create storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  20971520, -- 20MB
  array['image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do nothing;

-- RLS: authenticated users can upload to their own prefix
create policy "Users upload own media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: public read
create policy "Public read property media"
  on storage.objects for select
  to public
  using (bucket_id = 'property-media');

-- RLS: users can delete own media
create policy "Users delete own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
