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
  lead_id: z.string().uuid().optional(),
  context: z.string().min(10),
  meeting_at: z.string().datetime().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { lead_id, context, meeting_at } = parsed.data

  const { data: userData } = await supabase
    .from("users")
    .select("broker_name, name, nara_formality")
    .eq("id", user.id)
    .single()

  let leadInfo = ""
  if (lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("name, estimated_budget, status, temperature, notes")
      .eq("id", lead_id)
      .eq("user_id", user.id)
      .single()
    if (lead) {
      leadInfo = `
Cliente: ${lead.name}
Temperatura: ${lead.temperature ?? "desconhecida"}
Status no pipeline: ${lead.status}
Budget estimado: ${lead.estimated_budget ? `R$ ${Number(lead.estimated_budget).toLocaleString("pt-BR")}` : "não informado"}
Notas anteriores: ${lead.notes ?? "nenhuma"}`
    }
  }

  const brokerName = userData?.broker_name ?? userData?.name ?? "o corretor"
  const formality = userData?.nara_formality ?? "informal"
  const meetingDate = meeting_at ? new Date(meeting_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "em breve"

  const prompt = `Você é a Cora, coach de negociação imobiliária do corretor ${brokerName}.
Prepare um briefing de pré-reunião completo para a reunião marcada para ${meetingDate}.

${leadInfo ? `Dados do cliente:\n${leadInfo}` : ""}

Contexto fornecido pelo corretor:
${context}

Tom: ${formality === "formal" ? "profissional e objetivo" : "direto e prático"}

Gere um briefing estruturado com:

**1. Perfil do cliente** (o que sabemos / o que precisamos descobrir)
**2. Objeções prováveis** (liste 3-4 com contra-argumentos práticos)
**3. Ponto de fechamento** (qual o gatilho certo para esse perfil)
**4. Faixa de desconto segura** (baseado no que foi informado)
**5. Pergunta-chave de abertura** (para o início da reunião)
**6. Sinal de compra** (o que ficaria de olho durante a conversa)

Lembre: você SUGERE ângulos, não decide. O corretor decide. Disclaimer ao final: "Sugestão de apoio — você decide."

Escreva em português brasileiro, direto ao ponto, sem rodeios.`

  try {
    const res = await getAI().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })
    const briefing = (res.content[0] as { type: string; text: string }).text

    const { data: session } = await supabase
      .from("negotiation_sessions")
      .insert({
        user_id: user.id,
        lead_id: lead_id ?? null,
        context,
        briefing,
        meeting_at: meeting_at ?? null,
      })
      .select()
      .single()

    await supabase.from("module_adoption_metrics").upsert(
      { user_id: user.id, module: "cora_treina", last_used_at: new Date().toISOString() },
      { onConflict: "user_id,module", ignoreDuplicates: false }
    )

    return NextResponse.json({ briefing, session_id: session?.id })
  } catch (err) {
    console.error("cora/treina error", err)
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("negotiation_sessions")
    .select("id, context, briefing, meeting_at, outcome, created_at, lead_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
