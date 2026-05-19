import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createHash } from "crypto"

export const dynamic = "force-dynamic"

let _ai: Anthropic | null = null
function getAI() {
  if (!_ai) _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _ai
}

const DISCLAIMER = "Esta estimativa é informativa e não constitui avaliação imobiliária formal (NBR 14.653). Para avaliações com validade legal, consulte profissional habilitado pelo CFC ou CRECI com curso de avaliação."

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-moova-api-key")
  if (!apiKey) return NextResponse.json({ error: "API key obrigatória. Header: X-Moova-API-Key" }, { status: 401 })

  const supabase = createAdminClient()
  const { data: userRow } = await supabase
    .from("users")
    .select("id, broker_name, name")
    .eq("cma_api_key", apiKey)
    .single()

  if (!userRow) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const body = await req.json()
  const { address, city, state, property_type, area_sqm, bedrooms, condition, extra_notes, client_ref } = body

  if (!address || !city || !state || !property_type || !area_sqm) {
    return NextResponse.json({ error: "Campos obrigatórios: address, city, state, property_type, area_sqm" }, { status: 400 })
  }

  const prompt = `Você é um especialista em mercado imobiliário brasileiro. Gere uma análise comparativa de mercado (CMA) profissional para uso B2B (banco, FII, seguradora).

Imóvel:
- Endereço: ${address}
- Cidade/Estado: ${city}/${state}
- Tipo: ${property_type}
- Área: ${area_sqm}m²
${bedrooms ? `- Quartos: ${bedrooms}` : ""}
${condition ? `- Conservação: ${condition}` : ""}
${extra_notes ? `- Informações adicionais: ${extra_notes}` : ""}

Retorne APENAS JSON válido, sem texto antes ou depois:
{
  "price_min": <número inteiro em R$>,
  "price_max": <número inteiro em R$>,
  "price_suggested": <número inteiro em R$>,
  "price_per_sqm": <número inteiro em R$>,
  "margin_of_error": "<porcentagem, ex: ±12%>",
  "confidence_level": "<baixo|médio|alto>",
  "market_context": "<análise do mercado local em 2-3 frases>",
  "factors_positive": ["<fator>", ...],
  "factors_negative": ["<fator>", ...],
  "comparables": [
    {"description": "<descrição do comparável>", "price": <número>, "distance": "<distância estimada>"},
    ...
  ],
  "recommendation": "<recomendação objetiva para decisão B2B>",
  "data_quality": "<nota sobre qualidade dos dados disponíveis>"
}`

  let result
  try {
    const res = await getAI().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    })
    const raw = (res.content[0] as { type: string; text: string }).text
    const match = raw.match(/\{[\s\S]*\}/)
    result = JSON.parse(match ? match[0] : raw)
  } catch {
    return NextResponse.json({ error: "Falha ao gerar análise" }, { status: 500 })
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex")

  await supabase.from("cma_enterprise_requests").insert({
    user_id: userRow.id,
    api_key_hash: keyHash,
    client_ref,
    address,
    city,
    state,
    property_type,
    area_sqm,
    result,
  })

  return NextResponse.json({
    cma: result,
    meta: {
      address,
      city,
      state,
      property_type,
      area_sqm,
      generated_at: new Date().toISOString(),
      powered_by: "Moova Data — CMA Enterprise",
      disclaimer: DISCLAIMER,
    },
  })
}
