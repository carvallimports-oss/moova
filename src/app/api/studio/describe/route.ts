import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

let _anthropic: Anthropic | null = null
function getAI(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

export const dynamic = "force-dynamic"

const schema = z.object({
  property_id: z.string().uuid(),
  title: z.string(),
  type: z.string().optional(),
  bedrooms: z.number().int().optional(),
  area_sqm: z.number().optional(),
  price: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  extra_notes: z.string().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: userData } = await supabase
    .from("users")
    .select("nara_formality, nara_custom_prompt, broker_name, name, city")
    .eq("id", user.id)
    .single()

  const { title, type, bedrooms, area_sqm, price, address, city, extra_notes } = parsed.data
  const formality = userData?.nara_formality ?? "informal"
  const brokerName = userData?.broker_name ?? userData?.name ?? "o corretor"
  const brokerCity = userData?.city ?? city ?? ""

  const prompt = `Você é um especialista em marketing imobiliário brasileiro. Escreva uma descrição de imóvel atraente e otimizada para SEO local.

Dados do imóvel:
- Título: ${title}
${type ? `- Tipo: ${type}` : ""}
${bedrooms ? `- Quartos: ${bedrooms}` : ""}
${area_sqm ? `- Área: ${area_sqm}m²` : ""}
${price ? `- Preço: R$ ${price.toLocaleString("pt-BR")}` : ""}
${address ? `- Endereço: ${address}` : ""}
${city ?? brokerCity ? `- Cidade: ${city ?? brokerCity}` : ""}
${extra_notes ? `- Observações do corretor: ${extra_notes}` : ""}

Tom do corretor: ${formality === "formal" ? "formal e profissional" : "informal e próximo"}
Corretor: ${brokerName}

Escreva uma descrição com:
1. Parágrafo de abertura emocionalmente envolvente (2-3 frases)
2. Destaques do imóvel em bullets (3-5 itens)
3. Parágrafo de fechamento com call to action

Máximo 300 palavras. Não invente informações que não foram fornecidas. Escreva em português brasileiro.`

  try {
    const ai = getAI()
    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    const description = (response.content[0] as { type: string; text: string }).text

    await supabase.from("property_media").insert({
      property_id: parsed.data.property_id,
      user_id: user.id,
      type: "description_ai",
      url: "",
      metadata: { description, generated_at: new Date().toISOString() },
    })

    await supabase.from("module_adoption_metrics").upsert(
      { user_id: user.id, module: "studio_describe", last_used_at: new Date().toISOString() },
      { onConflict: "user_id,module", ignoreDuplicates: false }
    )

    return NextResponse.json({ description })
  } catch (err) {
    console.error("studio/describe error", err)
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }
}
