import { inngest } from "../client"
import {
  checkAIHealth,
  buildCoraSystemPrompt,
  generateCoraResponse,
  DEGRADED_MODE_MESSAGE,
} from "@/lib/ai/cora"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

export const processWhatsAppMessage = inngest.createFunction(
  {
    id: "process-whatsapp-message",
    retries: 3,
    triggers: [{ event: "whatsapp/message.received" }],
  },
  async ({ event, step }) => {
    const { from, type, text } = event.data as {
      from: string
      type: string
      text?: string
      audioBase64?: string
      imageUrl?: string
      timestamp: number
      messageId: string
    }

    // 1. Health check das IAs
    const health = await step.run("check-ai-health", () => checkAIHealth())

    if (!health.anyAvailable) {
      await step.run("send-degraded-message", async () => {
        const provider = createWhatsAppProvider("evolution")
        await provider.sendMessage({
          to: from,
          text: DEGRADED_MODE_MESSAGE("o corretor", "+55 11 99999-9999", "em breve"),
        })
      })
      // TODO: registrar em fallback_incidents e notificar corretor (push + SMS + email)
      return { status: "degraded" }
    }

    // 2. Buscar contexto do lead e corretor no Supabase
    // TODO: implementar busca por número de telefone → lead + corretor

    // 3. Gerar resposta da Cora
    const systemPrompt = buildCoraSystemPrompt(
      "Corretor", // TODO: pegar do banco
      "+55 11 99999-9999",
      "informal"
    )

    const coraResponse = await step.run("generate-cora-response", () =>
      generateCoraResponse(systemPrompt, [
        { role: "user", content: text ?? "(mensagem sem texto)" },
      ])
    )

    // 4. Verificar se precisa de aprovação humana (30d após onboarding)
    // TODO: checar human_approvals_active e categoria da mensagem

    // 5. Enviar resposta
    await step.run("send-response", async () => {
      const provider = createWhatsAppProvider("evolution")
      await provider.sendMessage({ to: from, text: coraResponse })
    })

    // 6. Salvar mensagens no banco
    // TODO: salvar em conversations + messages com audit_log

    return { status: "ok", from, type }
  }
)
