import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import OpenAI from "openai"

export const dynamic = "force-dynamic"

// POST /api/cora/analyze-tone — M04A: analisa mensagens do corretor e gera prompt personalizado
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Busca últimas 500 mensagens enviadas pelo corretor
  const { data: messages } = await supabase
    .from("messages")
    .select("content, created_at")
    .eq("user_id", user.id)
    .eq("sender", "corretor")
    .order("created_at", { ascending: false })
    .limit(500)

  if (!messages || messages.length < 5) {
    return NextResponse.json(
      { error: "Mensagens insuficientes. Converse com pelo menos 5 leads antes de analisar seu tom." },
      { status: 422 }
    )
  }

  const sample = messages.map((m) => m.content).join("\n---\n")

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Você é um especialista em análise de comunicação para corretores de imóveis brasileiros.
Analise o estilo de escrita do corretor e gere instruções para que a IA assistente (Cora) mimetize seu tom.
Responda APENAS com o texto do prompt personalizado (sem explicações, sem cabeçalho, no máximo 200 palavras).
O prompt deve completar a frase: "Além das instruções acima, adote também estas características específicas deste corretor:"`,
      },
      {
        role: "user",
        content: `Analise estas ${messages.length} mensagens enviadas pelo corretor e identifique: nível de formalidade, uso de emojis, saudações típicas, frases características, ritmo de escrita (mensagens curtas vs longas), e qualquer traço de personalidade marcante.\n\nMensagens:\n${sample.substring(0, 8000)}`,
      },
    ],
  })

  const customPrompt = completion.choices[0]?.message?.content ?? ""
  if (!customPrompt) return NextResponse.json({ error: "Falha na análise" }, { status: 500 })

  const adminClient = createAdminClient()
  await adminClient.from("users").update({ cora_custom_prompt: customPrompt }).eq("id", user.id)

  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    action: "cora_tone_analyzed",
    entity_type: "user",
    entity_id: user.id,
    payload: { messagesSampled: messages.length, promptLength: customPrompt.length },
  })

  return NextResponse.json({ ok: true, customPrompt })
}
