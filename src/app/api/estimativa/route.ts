import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

let _ai: Anthropic | null = null
function getAI() {
  if (!_ai) _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _ai
}

const DISCLAIMER = "Esta estimativa é informativa e não constitui avaliação imobiliária formal (NBR 14.653). Para validade legal, consulte profissional habilitado pelo CFC ou CRECI."

const schema = z.object({
  property_id: z.string().uuid().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().length(2),
  property_type: z.string(),
  area_sqm: z.number().positive(),
  bedrooms: z.number().int().min(0).optional(),
  condition: z.enum(["novo","otimo","bom","regular","necessita_reforma"]).default("bom"),
  extra_notes: z.string().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { address, city, state, property_type, area_sqm, bedrooms, condition, extra_notes, property_id } = parsed.data

  const conditionLabels: Record<string, string> = {
    novo: "Novo/lançamento",
    otimo: "Ótimo estado",
    bom: "Bom estado",
    regular: "Estado regular",
    necessita_reforma: "Necessita reforma",
  }

  const prompt = `Você é um especialista em mercado imobiliário brasileiro. Gere uma Estimativa de Mercado (CMA) para o imóvel abaixo.

DADOS:
- Endereço: ${address}
- Cidade/UF: ${city}/${state}
- Tipo: ${property_type}
- Área: ${area_sqm}m²
${bedrooms !== undefined ? `- Quartos: ${bedrooms}` : ""}
- Estado de conservação: ${conditionLabels[condition]}
${extra_notes ? `- Observações: ${extra_notes}` : ""}

Gere uma resposta em JSON válido com este formato exato:
{
  "price_min": <número sem formatação>,
  "price_max": <número sem formatação>,
  "price_suggested": <número sem formatação>,
  "price_per_sqm_min": <número>,
  "price_per_sqm_max": <número>,
  "margin_of_error": <percentual como número, ex: 15>,
  "market_context": "<2-3 frases sobre o mercado em ${city}/${state} para esse tipo de imóvel>",
  "factors_positive": ["fator1", "fator2", "fator3"],
  "factors_negative": ["fator1", "fator2"],
  "comparables": [
    { "description": "<imóvel comparável hipotético 1>", "price": <número>, "area_sqm": <número> },
    { "description": "<imóvel comparável hipotético 2>", "price": <número>, "area_sqm": <número> },
    { "description": "<imóvel comparável hipotético 3>", "price": <número>, "area_sqm": <número> }
  ],
  "recommendation": "<1 frase de recomendação de preço de listagem>"
}

Use dados realistas do mercado brasileiro de 2025-2026. Responda APENAS com o JSON, sem texto adicional.`

  try {
    const res = await getAI().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = (res.content[0] as { type: string; text: string }).text
    let cma: Record<string, unknown>
    try {
      cma = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error("Invalid JSON response")
      cma = JSON.parse(match[0])
    }

    const { data: estimate } = await supabase
      .from("property_estimates")
      .insert({
        user_id: user.id,
        property_id: property_id ?? null,
        address,
        city,
        state,
        property_type,
        area_sqm,
        bedrooms: bedrooms ?? null,
        price_min: cma.price_min,
        price_max: cma.price_max,
        price_suggested: cma.price_suggested,
        comparables: cma.comparables,
        margin_of_error: cma.margin_of_error,
        disclaimer: DISCLAIMER,
      })
      .select()
      .single()

    await supabase.from("module_adoption_metrics").upsert(
      { user_id: user.id, module: "moova_estimativa", last_used_at: new Date().toISOString() },
      { onConflict: "user_id,module", ignoreDuplicates: false }
    )

    return NextResponse.json({ ...cma, estimate_id: estimate?.id, disclaimer: DISCLAIMER })
  } catch (err) {
    console.error("estimativa error", err)
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("property_estimates")
    .select("id, address, city, state, property_type, area_sqm, price_min, price_max, price_suggested, disclaimer, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
