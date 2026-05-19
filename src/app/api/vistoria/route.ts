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

const schema = z.object({
  address: z.string().min(5),
  property_id: z.string().uuid().optional(),
  rooms: z.array(z.object({
    name: z.string(),
    condition: z.enum(["otimo","bom","regular","ruim","pessimo"]),
    observations: z.string().optional(),
  })).min(1),
  general_observations: z.string().optional(),
  property_type: z.string().optional(),
  area_sqm: z.number().optional(),
})

const CONDITION_PT: Record<string, string> = {
  otimo: "Ótimo", bom: "Bom", regular: "Regular", ruim: "Ruim", pessimo: "Péssimo"
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { address, property_id, rooms, general_observations, property_type, area_sqm } = parsed.data

  const roomsList = rooms.map((r) =>
    `- ${r.name}: ${CONDITION_PT[r.condition]}${r.observations ? ` — ${r.observations}` : ""}`
  ).join("\n")

  const prompt = `Você é um especialista em vistoria imobiliária de apoio. Gere um relatório técnico estruturado.

DADOS DO IMÓVEL:
- Endereço: ${address}
${property_type ? `- Tipo: ${property_type}` : ""}
${area_sqm ? `- Área: ${area_sqm}m²` : ""}

CÔMODOS VISTORIADOS:
${roomsList}

${general_observations ? `OBSERVAÇÕES GERAIS DO CORRETOR:\n${general_observations}` : ""}

Gere um relatório com:

**SUMÁRIO EXECUTIVO**
(2-3 frases sobre o estado geral do imóvel)

**ESTADO POR CÔMODO**
(para cada cômodo: estado, observações, recomendações específicas)

**PENDÊNCIAS IDENTIFICADAS**
(lista de itens que precisam de atenção, ordenados por urgência: Alta / Média / Baixa)

**ESTIMATIVA DE INTERVENÇÃO**
(estimativa de custo de manutenção por faixa: R$ X a Y, com ressalva de variação regional)

**RECOMENDAÇÕES AO COMPRADOR/LOCATÁRIO**
(o que negociar, o que exigir como condição, o que aceitar)

IMPORTANTE: Este é um relatório técnico de APOIO. Sempre inclua ao final:
"⚠️ Este relatório é de apoio e NÃO substitui laudo oficial emitido por profissional habilitado (CREA, CAU ou CRECI com curso técnico). Validade legal somente com revisão e assinatura de profissional habilitado."

Escreva em português brasileiro formal. Seja específico e objetivo.`

  try {
    const res = await getAI().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })
    const reportText = (res.content[0] as { type: string; text: string }).text

    const reportJson = { address, rooms, general_observations, report_text: reportText, generated_at: new Date().toISOString() }

    const { data: inspection } = await supabase
      .from("inspections_support")
      .insert({
        user_id: user.id,
        property_id: property_id ?? null,
        address,
        status: "ready",
        report_json: reportJson,
      })
      .select()
      .single()

    await supabase.from("module_adoption_metrics").upsert(
      { user_id: user.id, module: "moova_vistoria", last_used_at: new Date().toISOString() },
      { onConflict: "user_id,module", ignoreDuplicates: false }
    )

    return NextResponse.json({ report: reportText, inspection_id: inspection?.id })
  } catch (err) {
    console.error("vistoria error", err)
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("inspections_support")
    .select("id, address, status, report_json, created_at, property_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
