import type { LeadTemperature } from "@/types"

type ClassifyLeadInput = {
  name: string
  messageHistory: string[]
  estimatedBudget?: number
  region?: string
  notes?: string
}

type ClassifyLeadResult = {
  temperature: LeadTemperature
  reasoning: string
  nextAction: string
}

const CLASSIFY_PROMPT = `Você é um especialista em qualificação de leads imobiliários no Brasil.
Analise o perfil e o histórico de mensagens do lead e classifique sua temperatura segundo os critérios:

QUENTE: Demonstra urgência clara, budget definido, localização específica, pronto para visita ou negociação.
MORNO: Demonstra interesse real mas sem urgência imediata. Tem algumas dúvidas a resolver.
FRIO: Demonstra interesse superficial, sem clareza de budget ou prazo. Pode estar só pesquisando.
INERTE: Não responde, sem engajamento, ou claramente sem intenção de compra/aluguel agora.

Responda EXATAMENTE em JSON com os campos:
{
  "temperature": "QUENTE"|"MORNO"|"FRIO"|"INERTE",
  "reasoning": "2-3 frases explicando a classificação",
  "nextAction": "próxima ação recomendada para o corretor (1 frase)"
}`

let _openai: import("openai").OpenAI | null = null

function getOpenAI() {
  if (!_openai) {
    const { default: OpenAI } = require("openai")
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai!
}

export async function classifyLead(input: ClassifyLeadInput): Promise<ClassifyLeadResult> {
  const userContent = [
    `Nome do lead: ${input.name}`,
    input.estimatedBudget ? `Budget estimado: R$ ${input.estimatedBudget.toLocaleString("pt-BR")}` : "",
    input.region ? `Região de interesse: ${input.region}` : "",
    input.notes ? `Observações do corretor: ${input.notes}` : "",
    "",
    "Histórico de mensagens (mais recentes por último):",
    ...input.messageHistory.map((m, i) => `${i + 1}. ${m}`),
  ].filter(Boolean).join("\n")

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: CLASSIFY_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 400,
  })

  const raw = completion.choices[0]?.message?.content ?? "{}"
  const parsed = JSON.parse(raw) as ClassifyLeadResult

  const validTemps: LeadTemperature[] = ["QUENTE", "MORNO", "FRIO", "INERTE"]
  if (!validTemps.includes(parsed.temperature)) parsed.temperature = "FRIO"

  return parsed
}
