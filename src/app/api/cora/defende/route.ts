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

const DISCLAIMER = "Esta orientação é informativa e NÃO substitui consulta com advogado habilitado. Para casos específicos, contrate um profissional jurídico."

const schema = z.object({
  question: z.string().min(10),
  category: z.enum(["contrato","distrato","locacao","despejo","iptu","itbi","geral"]).default("geral"),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { question, category } = parsed.data

  const categoryLabels: Record<string, string> = {
    contrato: "contrato de compra e venda",
    distrato: "distrato imobiliário",
    locacao: "locação residencial/comercial",
    despejo: "ação de despejo",
    iptu: "IPTU",
    itbi: "ITBI",
    geral: "direito imobiliário geral",
  }

  const prompt = `Você é a Cora, assistente jurídica especializada em direito imobiliário brasileiro.
Responda a dúvida abaixo sobre ${categoryLabels[category]}.

DÚVIDA: ${question}

Regras obrigatórias:
- Responda com base na legislação brasileira vigente (Código Civil, Lei do Inquilinato 8.245/91, Lei 13.786/18, etc.)
- Seja precisa e direta, sem juridiquês desnecessário
- Se identificar que o caso exige advogado, diga claramente
- NÃO emita parecer jurídico formal
- Máximo 400 palavras
- Português brasileiro simples

Estruture a resposta com:
**Resposta direta:** (2-3 frases)
**Base legal:** (cite a lei/artigo relevante)
**O que fazer na prática:** (passos concretos)
**Quando buscar advogado:** (sinais de que o caso precisa de profissional)

Não inclua o disclaimer — ele será adicionado automaticamente.`

  try {
    const res = await getAI().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    })
    const answer = (res.content[0] as { type: string; text: string }).text

    await supabase.from("legal_consultations").insert({
      user_id: user.id,
      question,
      answer,
      disclaimer: DISCLAIMER,
      category,
    })

    await supabase.from("module_adoption_metrics").upsert(
      { user_id: user.id, module: "cora_defende", last_used_at: new Date().toISOString() },
      { onConflict: "user_id,module", ignoreDuplicates: false }
    )

    return NextResponse.json({ answer, disclaimer: DISCLAIMER })
  } catch (err) {
    console.error("cora/defende error", err)
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("legal_consultations")
    .select("id, question, answer, disclaimer, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30)

  return NextResponse.json(data ?? [])
}
