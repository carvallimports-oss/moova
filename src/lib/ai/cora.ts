import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

// Clientes lazy — só inicializados quando chamados
let _openai: OpenAI | null = null
let _anthropic: Anthropic | null = null

function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// Piso de identidade da Cora Constitution — não-negociável
const CORA_IDENTITY_FLOOR = `
Você é a Cora, assistente de IA de um corretor de imóveis brasileiro.

ATRIBUTOS CONSTANTES (nunca mudam):
- Precisa: informação certa, fonte clara, número exato. Não inventa, não "acha".
- Calorosa: tom humano, brasileiro, sem corporativês.
- Direta: não enrola, não rodeia. Respeita o tempo do lead.

NUNCA:
- Mentir sobre ser IA quando perguntada diretamente
- Oferecer valor, preço, condição ou prazo que o corretor não autorizou
- Inventar informação sobre imóvel que não está na base
- Prometer prazo de retorno que não controla
- Continuar conversa após pedido explícito de opt-out (LGPD)
- Sair de escopo imobiliário
- Julgar o lead
- Pressionar sem instrução explícita do corretor
- Usar "meu amor", "querida", "fofo", "lindinha", "prezado cliente", "conforme combinado"
- Usar mais de 1 emoji por mensagem

Se perguntada "você é robô?":
Responda: "Sou a Cora, assistente de IA do [Nome]. Quer falar direto com ele? Chamo na hora."

DISCLAIMER na primeira mensagem com cada lead:
"Oi! Aqui é a Cora, assistente do [Nome do corretor] pelo Moova. Atendo enquanto ele tá com outros clientes. Se quiser falar direto com ele, é só pedir — chamo na hora."
`

export function buildCoraSystemPrompt(
  brokerName: string,
  brokerPhone: string,
  formality: "formal" | "informal",
  customPrompt?: string,
  calendarContext?: string | null
): string {
  const toneGuide =
    formality === "formal"
      ? 'Tom formal: "Bom dia, Sr. Carlos. Confirmo a visita de amanhã às 10h?"'
      : 'Tom informal: "Oi Carlos, tudo bem? Confirma a visita amanhã 10h?"'

  return `${CORA_IDENTITY_FLOOR}

CORRETOR: ${brokerName}
TELEFONE DO CORRETOR: ${brokerPhone}
TOM: ${toneGuide}

${calendarContext ? `${calendarContext}\n` : ""}${customPrompt ? `INSTRUÇÕES ADICIONAIS DO CORRETOR:\n${customPrompt}` : ""}
`
}

export type AIHealthStatus = "ok" | "degraded"

export async function checkAIHealth(): Promise<{
  openai: AIHealthStatus
  anthropic: AIHealthStatus
  anyAvailable: boolean
}> {
  const [openaiOk, anthropicOk] = await Promise.allSettled([
    getOpenAI().models.list().then(() => true),
    getAnthropic().models.list().then(() => true),
  ])

  const openaiStatus = openaiOk.status === "fulfilled" ? "ok" : ("degraded" as AIHealthStatus)
  const anthropicStatus = anthropicOk.status === "fulfilled" ? "ok" : ("degraded" as AIHealthStatus)

  return {
    openai: openaiStatus,
    anthropic: anthropicStatus,
    anyAvailable: openaiStatus === "ok" || anthropicStatus === "ok",
  }
}

export async function generateCoraResponse(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  preferFallback = false
): Promise<string> {
  if (!preferFallback) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.7,
      })
      return response.choices[0].message.content ?? ""
    } catch {
      // cai para Anthropic
    }
  }

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  return block.type === "text" ? block.text : ""
}

export const DEGRADED_MODE_MESSAGE = (
  brokerName: string,
  brokerPhone: string,
  returnTime: string
) =>
  `Oi! Aqui é o ${brokerName}. Tô numa reunião nesse momento — volto até ${returnTime} e te respondo direto. Se for urgente urgente, pode me ligar no ${brokerPhone}. Anotei seu contato aqui, fica tranquilo.`
