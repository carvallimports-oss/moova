import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

let _ai: Anthropic | null = null
function getAI() {
  if (!_ai) _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _ai
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("credit_analyses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { subject_name, subject_cpf, monthly_income, rent_requested, subject_type, contract_id } = body

  if (!subject_name || !subject_cpf) {
    return NextResponse.json({ error: "Nome e CPF são obrigatórios" }, { status: 400 })
  }

  const income = parseFloat(monthly_income ?? 0)
  const rent = parseFloat(rent_requested ?? 0)
  const ratio = income > 0 ? parseFloat(((rent / income) * 100).toFixed(1)) : null

  // Simulated score (in production: integrate Serasa/Boa Vista API)
  const simulatedScore = Math.floor(Math.random() * 400) + 400

  const riskLevel = simulatedScore >= 700 ? "baixo" : simulatedScore >= 500 ? "medio" : simulatedScore >= 300 ? "alto" : "critico"
  const ratioOk = ratio === null || ratio <= 30
  const verdict = simulatedScore >= 600 && ratioOk ? "aprovado"
    : simulatedScore >= 500 ? "aprovado_com_ressalvas"
    : "reprovado"

  // AI analysis
  let aiSummary = ""
  let aiFlags: string[] = []
  try {
    const prompt = `Você é a Cora, analista de crédito da Moova. Analise o perfil de crédito do ${subject_type}:

Nome: ${subject_name}
Renda mensal: ${income > 0 ? `R$ ${income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "não informada"}
Aluguel solicitado: ${rent > 0 ? `R$ ${rent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "não informado"}
Comprometimento de renda: ${ratio !== null ? `${ratio}%` : "não calculável"}
Score simulado: ${simulatedScore}/1000
Nível de risco: ${riskLevel}

Escreva uma análise de crédito PROFISSIONAL em 3 parágrafos curtos:
1. Resumo do perfil e capacidade de pagamento
2. Pontos de atenção ou vantagens do perfil
3. Recomendação final e condições sugeridas (ex: seguro fiança, garantias adicionais)

Seja objetivo, use linguagem formal. Máximo 200 palavras. Português brasileiro.`

    const res = await getAI().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })
    aiSummary = (res.content[0] as { type: string; text: string }).text

    if (ratio !== null && ratio > 30) aiFlags.push(`Comprometimento de renda elevado: ${ratio}%`)
    if (simulatedScore < 600) aiFlags.push("Score de crédito abaixo do ideal")
    if (riskLevel === "alto" || riskLevel === "critico") aiFlags.push("Risco elevado — considere garantias adicionais")
  } catch {
    aiSummary = `Análise realizada em ${new Date().toLocaleDateString("pt-BR")}. Score: ${simulatedScore}/1000. Perfil classificado como risco ${riskLevel}.`
  }

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 90)

  const { data, error } = await supabase
    .from("credit_analyses")
    .insert({
      user_id: user.id,
      contract_id: contract_id ?? null,
      subject_name,
      subject_cpf,
      subject_type: subject_type ?? "inquilino",
      monthly_income: income > 0 ? income : null,
      rent_requested: rent > 0 ? rent : null,
      income_ratio: ratio,
      score: simulatedScore,
      score_source: "simulado",
      verdict,
      risk_level: riskLevel,
      ai_summary: aiSummary,
      ai_flags: aiFlags,
      valid_until: validUntil.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
