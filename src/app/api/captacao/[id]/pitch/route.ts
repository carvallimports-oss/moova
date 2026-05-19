import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

let _ai: Anthropic | null = null
function getAI() {
  if (!_ai) _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _ai
}

const SOURCE_LABELS: Record<string, string> = {
  contato_existente: "contato existente na agenda do corretor",
  portal_moova: "formulário no Moova Portal do corretor",
  anuncio_publico: "anúncio público do corretor",
  whatsapp_opt_in: "opt-in via WhatsApp",
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: lead } = await supabase
    .from("captacao_optin_leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })

  const { data: broker } = await supabase
    .from("users")
    .select("broker_name, name, city")
    .eq("id", user.id)
    .single()

  const brokerName = broker?.broker_name ?? broker?.name ?? "Corretor"
  const sourceLabel = SOURCE_LABELS[lead.optin_source] ?? lead.optin_source

  const prompt = `Você é a Cora, assistente da Moova. Gere um pitch personalizado de exclusividade para o corretor ${brokerName} abordar o proprietário ${lead.name}.

Dados do proprietário:
- Nome: ${lead.name}
- Endereço do imóvel: ${lead.property_address ?? "não informado"}
- Tipo: ${lead.property_type ?? "não informado"}
- Valor estimado: ${lead.estimated_value ? `R$ ${Number(lead.estimated_value).toLocaleString("pt-BR")}` : "não informado"}
- Como entrou em contato: ${sourceLabel}
- Observações: ${lead.notes ?? "nenhuma"}
- Cidade do corretor: ${broker?.city ?? "não informada"}

Escreva um pitch direto, profissional e humanizado que o corretor pode enviar por WhatsApp ou apresentar pessoalmente.
O objetivo é conseguir exclusividade de venda do imóvel.
Tom: calmo, confiante, sem juridiquês. Use linguagem natural brasileira.
Máximo 250 palavras.
Inclua: (1) abertura personalizada, (2) proposta de valor clara da parceria com exclusividade, (3) próxima ação sugerida.
NÃO invente dados que não foram fornecidos.`

  const res = await getAI().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  })
  const pitch = (res.content[0] as { type: string; text: string }).text

  await supabase
    .from("captacao_optin_leads")
    .update({ pitch_content: pitch })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({ pitch })
}
