-- Moova — Meta Cloud API (BSP) WhatsApp
-- Adiciona credenciais BSP à tabela whatsapp_accounts

alter table public.whatsapp_accounts
  add column if not exists bsp_phone_number_id text,
  add column if not exists bsp_waba_id         text,
  add column if not exists bsp_access_token    text,
  add column if not exists qr_code             text;

-- Índice para lookup por phone_number_id (webhook routing BSP)
create index if not exists idx_wa_bsp_phone_number_id
  on public.whatsapp_accounts(bsp_phone_number_id)
  where bsp_phone_number_id is not null;
