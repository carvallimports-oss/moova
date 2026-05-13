# ============================================================
# MOOVA — Script de Configuração de Ambiente
# Execute com: powershell -ExecutionPolicy Bypass -File setup.ps1
# ============================================================

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   MOOVA — Configuracao de Ambiente   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vou pedir cada chave de API. Deixe em branco para pular e configurar depois." -ForegroundColor Yellow
Write-Host ""

function Ask($label, $key, $required = $false) {
    $mark = if ($required) { " (obrigatoria)" } else { " (opcional)" }
    Write-Host ">> $label$mark" -ForegroundColor Green
    $val = Read-Host "   Cole aqui"
    return $val
}

# ── SUPABASE ──────────────────────────────────────────────────
Write-Host "--- SUPABASE ---" -ForegroundColor Magenta
Write-Host "Crie em: https://supabase.com/dashboard → New project" -ForegroundColor DarkGray
Write-Host "Depois va em: Settings → API" -ForegroundColor DarkGray
Write-Host ""
$supabaseUrl      = Ask "NEXT_PUBLIC_SUPABASE_URL (ex: https://xxxx.supabase.co)" "NEXT_PUBLIC_SUPABASE_URL" $true
$supabaseAnon     = Ask "NEXT_PUBLIC_SUPABASE_ANON_KEY (anon / public)" "NEXT_PUBLIC_SUPABASE_ANON_KEY" $true
$supabaseService  = Ask "SUPABASE_SERVICE_ROLE_KEY (service_role — nunca expor no frontend)" "SUPABASE_SERVICE_ROLE_KEY" $true

# ── OPENAI ────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- OPENAI (GPT-4o) ---" -ForegroundColor Magenta
Write-Host "Crie em: https://platform.openai.com/api-keys" -ForegroundColor DarkGray
$openaiKey = Ask "OPENAI_API_KEY (sk-...)" "OPENAI_API_KEY" $true

# ── ANTHROPIC ─────────────────────────────────────────────────
Write-Host ""
Write-Host "--- ANTHROPIC (Claude — fallback) ---" -ForegroundColor Magenta
Write-Host "Crie em: https://console.anthropic.com/settings/keys" -ForegroundColor DarkGray
$anthropicKey = Ask "ANTHROPIC_API_KEY (sk-ant-...)" "ANTHROPIC_API_KEY" $true

# ── ELEVENLABS ────────────────────────────────────────────────
Write-Host ""
Write-Host "--- ELEVENLABS (voz clonada) ---" -ForegroundColor Magenta
Write-Host "Crie em: https://elevenlabs.io → Profile → API Keys" -ForegroundColor DarkGray
$elevenKey = Ask "ELEVENLABS_API_KEY" "ELEVENLABS_API_KEY" $true

# ── EVOLUTION API ─────────────────────────────────────────────
Write-Host ""
Write-Host "--- EVOLUTION API (WhatsApp — cloud) ---" -ForegroundColor Magenta
Write-Host "Assine em: https://evolution-api.com ou use servico hospedado" -ForegroundColor DarkGray
Write-Host "URL ex: https://sua-instancia.evolution-api.com" -ForegroundColor DarkGray
$evolutionUrl = Ask "EVOLUTION_API_URL" "EVOLUTION_API_URL" $true
$evolutionKey = Ask "EVOLUTION_API_KEY" "EVOLUTION_API_KEY" $true

# ── ASAAS ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- ASAAS (pagamentos BR) ---" -ForegroundColor Magenta
Write-Host "Crie em: https://www.asaas.com → Integracao → API Key" -ForegroundColor DarkGray
Write-Host "Use sandbox primeiro: https://sandbox.asaas.com" -ForegroundColor DarkGray
$asaasKey      = Ask "ASAAS_API_KEY (sandbox: \$aact_...)" "ASAAS_API_KEY" $true
$asaasWebhook  = Ask "ASAAS_WEBHOOK_TOKEN (crie um token aleatorio)" "ASAAS_WEBHOOK_TOKEN"

# ── RESEND ────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- RESEND (email transacional) ---" -ForegroundColor Magenta
Write-Host "Crie em: https://resend.com/api-keys (plano gratuito: 3.000 emails/mes)" -ForegroundColor DarkGray
$resendKey = Ask "RESEND_API_KEY (re_...)" "RESEND_API_KEY"

# ── INNGEST ───────────────────────────────────────────────────
Write-Host ""
Write-Host "--- INNGEST (filas / workflows) ---" -ForegroundColor Magenta
Write-Host "Para desenvolvimento local NAO precisa de conta — use o dev server" -ForegroundColor DarkGray
Write-Host "Para producao, crie em: https://www.inngest.com" -ForegroundColor DarkGray
$inngestEvent  = Ask "INNGEST_EVENT_KEY (deixe em branco para dev local)" "INNGEST_EVENT_KEY"
$inngestSigning = Ask "INNGEST_SIGNING_KEY (deixe em branco para dev local)" "INNGEST_SIGNING_KEY"

# ── GERAR .env.local ──────────────────────────────────────────
Write-Host ""
Write-Host "Gerando .env.local..." -ForegroundColor Cyan

$envContent = @"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon
SUPABASE_SERVICE_ROLE_KEY=$supabaseService

# OpenAI
OPENAI_API_KEY=$openaiKey

# Anthropic (fallback)
ANTHROPIC_API_KEY=$anthropicKey

# ElevenLabs
ELEVENLABS_API_KEY=$elevenKey

# Evolution API (WhatsApp MVP)
EVOLUTION_API_URL=$evolutionUrl
EVOLUTION_API_KEY=$evolutionKey

# Asaas (pagamentos)
ASAAS_API_KEY=$asaasKey
ASAAS_WEBHOOK_TOKEN=$asaasWebhook

# Resend (email)
RESEND_API_KEY=$resendKey

# Inngest
INNGEST_EVENT_KEY=$inngestEvent
INNGEST_SIGNING_KEY=$inngestSigning

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@

$envContent | Out-File -FilePath ".env.local" -Encoding utf8
Write-Host ".env.local criado com sucesso!" -ForegroundColor Green

# ── APLICAR MIGRATION NO SUPABASE ─────────────────────────────
if ($supabaseUrl -and $supabaseService) {
    Write-Host ""
    Write-Host "Para aplicar o schema no Supabase, va em:" -ForegroundColor Yellow
    Write-Host "  $supabaseUrl/project/_/sql" -ForegroundColor Cyan
    Write-Host "  e cole o conteudo de: supabase/migrations/0001_initial_schema.sql" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   Configuracao concluida!            " -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Abra o Supabase SQL Editor e cole o arquivo de migration" -ForegroundColor White
Write-Host "  2. npm run dev   (para rodar o projeto)" -ForegroundColor White
Write-Host "  3. npx inngest-cli@latest dev  (em outro terminal, para as filas)" -ForegroundColor White
Write-Host ""
