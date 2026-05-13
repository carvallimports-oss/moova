# Moova — Guia de Configuração

Siga cada passo em ordem. Depois de ter todas as chaves, execute `setup.ps1`.

---

## 1. Supabase (banco de dados) — GRATUITO

1. Acesse https://supabase.com e clique em **Start your project**
2. Crie uma conta com Google ou GitHub
3. Clique em **New project**
   - Name: `moova`
   - Database Password: crie uma senha forte e guarde
   - Region: `South America (São Paulo)`
4. Aguarde ~2 minutos para o projeto ser criado
5. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ nunca expor no frontend

### Aplicar o schema do banco
1. No Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `supabase/migrations/0001_initial_schema.sql`
4. Cole todo o conteúdo e clique em **Run**

---

## 2. OpenAI (GPT-4o) — PAGO (pay-as-you-go)

1. Acesse https://platform.openai.com
2. Crie uma conta
3. Adicione um método de pagamento (cartão internacional ou débito)
4. Vá em **API Keys → Create new secret key**
5. Copie a chave → `OPENAI_API_KEY`

> Custo estimado MVP: R$ 50–200/mês para 30 corretores

---

## 3. Anthropic — Claude (fallback) — PAGO (pay-as-you-go)

1. Acesse https://console.anthropic.com
2. Crie uma conta
3. Adicione créditos (mínimo $5)
4. Vá em **Settings → API Keys → Create Key**
5. Copie → `ANTHROPIC_API_KEY`

---

## 4. ElevenLabs (voz clonada) — GRATUITO/PAGO

1. Acesse https://elevenlabs.io
2. Crie uma conta
3. Plano gratuito: 10.000 caracteres/mês (para testes)
4. Para MVP: plano Starter ($5/mês) ou Creator ($22/mês)
5. Vá em **Profile → API Keys**
6. Copie → `ELEVENLABS_API_KEY`

---

## 5. Evolution API (WhatsApp — cloud hospedado)

### Opção A: EvolutionAPI.com oficial
1. Acesse https://evolution-api.com
2. Contrate o plano cloud
3. Anote a URL e API Key fornecidas

### Opção B: Hospedar em VPS (Railway/Render — mais barato)
1. Acesse https://railway.app
2. Deploy do template Evolution API
3. Custo: ~$5/mês

Após configurar:
- `EVOLUTION_API_URL` → URL base (ex: `https://sua-instancia.railway.app`)
- `EVOLUTION_API_KEY` → sua API key da instância

---

## 6. Asaas (pagamentos BR) — GRATUITO para criar

1. Acesse https://www.asaas.com e crie uma conta PJ
2. Para testes, use o sandbox: https://sandbox.asaas.com
3. Vá em **Configurações → Integrações → API**
4. Copie a chave → `ASAAS_API_KEY`
5. Para `ASAAS_WEBHOOK_TOKEN`: crie qualquer string aleatória (ex: `moova_webhook_2026`)

---

## 7. Resend (email transacional) — GRATUITO

1. Acesse https://resend.com e crie uma conta
2. Plano gratuito: 3.000 emails/mês
3. Vá em **API Keys → Create API Key**
4. Copie → `RESEND_API_KEY`

---

## 8. Inngest (filas) — NÃO precisa de conta para desenvolvimento

Para desenvolvimento local, o Inngest roda sem conta.
Para produção, crie conta em https://www.inngest.com (plano gratuito disponível).

---

## Configurar o .env.local

Depois de ter todas as chaves, abra o terminal no VS Code e execute:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

O script vai pedir cada chave e criar o `.env.local` automaticamente.

---

## Rodar o projeto

Abra **dois terminais** no VS Code:

**Terminal 1 — Next.js:**
```bash
npm run dev
```

**Terminal 2 — Inngest (filas):**
```bash
npx inngest-cli@latest dev
```

Acesse: http://localhost:3000

---

## Custo estimado total (MVP — 30 corretores)

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Supabase | Pro | $25 (~R$ 130) |
| OpenAI GPT-4o | Pay-as-you-go | ~$30–80 (~R$ 165–440) |
| Anthropic | Pay-as-you-go | ~$5–15 (~R$ 27–82) |
| ElevenLabs | Creator | $22 (~R$ 121) |
| Evolution API | Cloud | ~$30 (~R$ 165) |
| Vercel | Pro | $20 (~R$ 110) |
| Inngest | Free/Pay-as-you-go | $0–25 |
| Resend | Free | $0 |
| Asaas | Gratuito | $0 |
| **Total** | | **~R$ 750–1.100/mês** |

Receita com 30 corretores a R$799/mês = **R$ 23.970/mês**. Margem folgada.
