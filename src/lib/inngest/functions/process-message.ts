import { inngest } from "../client"
import {
  checkAIHealth,
  buildCoraSystemPrompt,
  buildOutsideHoursMessage,
  generateCoraResponse,
  DEGRADED_MODE_MESSAGE,
} from "@/lib/ai/cora"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"
import { speechToText } from "@/lib/ai/voice"
import { createAdminClient } from "@/lib/supabase/admin"

// Categorias que podem exigir aprovação humana
const APPROVAL_TRIGGERS: Record<string, RegExp> = {
  visita: /visita|agendar|marcar|quando.*ver|quero.*ver|posso.*ver|você.*mostra/i,
  valor: /preço|valor|custa|quanto|desconto|negoci|proposta|oferta|orçamento/i,
  contraproposta: /contraproposta|contra-proposta|ofereço|toparia|aceito se/i,
  fechamento: /fechar|vou.*comprar|quero.*comprar|vou.*alugar|quero.*alugar|assinar|fechamos/i,
}

// Escalação para humano (M05D)
const HUMAN_REQUEST = /falar.*corretor|falar.*humano|falar.*você|chama.*ele|quero.*ele|passa.*corretor|fala.*com.*ele|atendimento.*humano|não.*robô/i

// Opt-out LGPD (M13)
const LGPD_OPTOUT = /não.*quero.*mensagem|para.*mandar|remov.*contato|opt.?out|sair.*lista|me tira|não me.*manda|para de.*enviar|exclu.*meu.*contato/i

function detectApprovalCategory(text: string): string | null {
  for (const [cat, regex] of Object.entries(APPROVAL_TRIGGERS)) {
    if (regex.test(text)) return cat
  }
  return null
}

export const processWhatsAppMessage = inngest.createFunction(
  {
    id: "process-whatsapp-message",
    retries: 3,
    triggers: [{ event: "whatsapp/message.received" }],
  },
  async ({ event, step }) => {
    const { from, type, text, audioBase64, imageUrl, instanceName } = event.data as {
      from: string
      type: string
      text?: string
      audioBase64?: string
      imageUrl?: string
      timestamp: number
      messageId: string
      instanceName?: string
    }

    const supabase = createAdminClient()

    // 1. Health check das IAs
    const health = await step.run("check-ai-health", () => checkAIHealth())

    // 2. Buscar broker pela instance do WhatsApp
    const broker = await step.run("fetch-broker", async () => {
      if (!instanceName) return null
      const { data: wa } = await supabase
        .from("whatsapp_accounts")
        .select("user_id, provider")
        .eq("instance_name", instanceName)
        .single()
      if (!wa) return null

      const { data: user } = await supabase
        .from("users")
        .select("id, broker_name, name, phone, email, cora_formality, cora_custom_prompt, human_approval_active, human_approval_disabled_at, human_approval_categories, created_at, google_calendar_connected, cora_work_start, cora_work_end")
        .eq("id", wa.user_id)
        .single()

      return user ? { ...user, provider: wa.provider } : null
    })

    if (!broker) return { status: "no_broker", instanceName }

    const brokerName = broker.broker_name ?? broker.name ?? "o corretor"
    const brokerPhone = broker.phone ?? ""

    // 3. Modo degradado
    if (!health.anyAvailable) {
      await step.run("handle-degraded", async () => {
        const returnTime = new Date(Date.now() + 2 * 3600000).toLocaleTimeString("pt-BR", {
          hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
        })
        const provider = createWhatsAppProvider((broker.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({
          to: from,
          text: DEGRADED_MODE_MESSAGE(brokerName, brokerPhone, returnTime),
        })

        await supabase.from("fallback_incidents").insert({
          openai_status: health.openai,
          anthropic_status: health.anthropic,
          started_at: new Date().toISOString(),
          affected_conversations: 1,
        })
      })

      await inngest.send({
        name: "ai/degraded.detected",
        data: { affectedLeads: 1, incidentAt: new Date().toISOString() },
      })

      return { status: "degraded" }
    }

    // 4. Buscar ou criar lead pelo telefone
    const lead = await step.run("find-or-create-lead", async () => {
      const phone = from.replace("@s.whatsapp.net", "").replace(/\D/g, "")
      const { data: existing } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", broker.id)
        .eq("phone", phone)
        .single()

      if (existing) return existing

      const { data: created } = await supabase
        .from("leads")
        .insert({ user_id: broker.id, name: phone, phone, temperature: "FRIO" })
        .select()
        .single()

      return created
    })

    if (!lead) return { status: "lead_error" }

    // 4b. LGPD opt-out — não processa mais mensagens desse lead
    if (lead.lgpd_optout_at) {
      return { status: "lgpd_optout", leadId: lead.id }
    }

    // 5. Buscar ou criar conversation
    const conversation = await step.run("find-or-create-conversation", async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, broker_took_over")
        .eq("user_id", broker.id)
        .eq("lead_id", lead.id)
        .eq("is_active", true)
        .single()

      if (existing) return existing

      const { data: created } = await supabase
        .from("conversations")
        .insert({ user_id: broker.id, lead_id: lead.id })
        .select("id, broker_took_over")
        .single()

      return created
    })

    if (!conversation) return { status: "conversation_error" }

    // 6. Processar mídia (áudio → texto, imagem → descrição)
    const messageText = await step.run("process-media", async () => {
      if (type === "audio" && audioBase64) {
        try {
          const audioBytes = Buffer.from(audioBase64, "base64")
          const transcribed = await speechToText(new Uint8Array(audioBytes), "audio/ogg")
          return `[Áudio transcrito]: ${transcribed}`
        } catch {
          return "[Áudio recebido — não foi possível transcrever]"
        }
      }
      if (type === "image" && imageUrl) {
        try {
          const { default: OpenAI } = await import("openai")
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageUrl } },
                { type: "text", text: "Descreva brevemente esta imagem no contexto de busca de imóveis." },
              ],
            }],
            max_tokens: 200,
          })
          return `[Imagem: ${response.choices[0].message.content}]`
        } catch {
          return "[Imagem recebida]"
        }
      }
      return text ?? ""
    })

    // 6b. Verificar horário de operação (M04E) — envia msg fora do horário e encerra
    const outsideHours = await step.run("check-operating-hours", async () => {
      const workStart = broker.cora_work_start ?? 8
      const workEnd = broker.cora_work_end ?? 20
      const hourBR = new Date().toLocaleString("en-US", {
        timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false,
      })
      const currentHour = parseInt(hourBR, 10)
      return currentHour < workStart || currentHour >= workEnd
    })

    if (outsideHours) {
      await step.run("send-outside-hours", async () => {
        const provider = createWhatsAppProvider((broker.provider ?? "evolution") as "evolution" | "bsp")
        const brokerName = broker.broker_name ?? broker.name ?? "o corretor"
        const workStart = broker.cora_work_start ?? 8
        await provider.sendMessage({
          to: from,
          text: buildOutsideHoursMessage(brokerName, workStart),
        })
      })
      return { status: "outside_hours" }
    }

    // 6c. LGPD opt-out detectado no texto (M13) — reconhece e encerra
    const isOptOut = LGPD_OPTOUT.test(messageText)
    if (isOptOut) {
      await step.run("handle-lgpd-optout", async () => {
        await supabase.from("leads").update({
          lgpd_optout_at: new Date().toISOString(),
        }).eq("id", lead.id)

        const provider = createWhatsAppProvider((broker.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({
          to: from,
          text: "Entendido! Removemos seu contato da lista de atendimento da Cora. Caso mude de ideia, é só entrar em contato diretamente com o corretor. Obrigado!",
        })

        await supabase.from("audit_logs").insert({
          user_id: broker.id,
          action: "lead_lgpd_optout",
          entity_type: "lead",
          entity_id: lead.id,
          payload: { phone: from, detected_text: messageText.slice(0, 100) },
        })
      })
      return { status: "lgpd_optout_registered", leadId: lead.id }
    }

    // 7. Salvar mensagem do lead
    await step.run("save-lead-message", async () => {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        lead_id: lead.id,
        user_id: broker.id,
        content: messageText,
        type: type as "text" | "audio" | "image",
        sender: "lead",
        flags: [],
      })

      await supabase.from("leads").update({
        last_message_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString(),
      }).eq("id", lead.id)

      await supabase.from("conversations").update({
        updated_at: new Date().toISOString(),
      }).eq("id", conversation.id)
    })

    // 7b. Escalação para humano (M05D) — lead pediu falar com o corretor
    const wantsHuman = HUMAN_REQUEST.test(messageText)
    if (wantsHuman) {
      await step.run("handle-escalation", async () => {
        await supabase.from("conversations").update({
          broker_took_over: true,
          broker_took_over_at: new Date().toISOString(),
        }).eq("id", conversation.id)

        const brokerName = broker.broker_name ?? broker.name ?? "o corretor"
        const provider = createWhatsAppProvider((broker.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({
          to: from,
          text: `Claro! Passei para o ${brokerName}. Ele entra em contato em breve! 👋`,
        })

        await supabase.from("audit_logs").insert({
          user_id: broker.id,
          action: "lead_escalated_to_human",
          entity_type: "conversation",
          entity_id: conversation.id,
          payload: { phone: from },
        })
      })
      return { status: "escalated_to_human", convId: conversation.id }
    }

    // 8. Detectar "vou pensar" → agendar retomada em 3 dias
    await step.run("check-thinking-signal", async () => {
      const THINKING = /vou pensar|deixa eu pensar|preciso pensar|vou ver|deixa eu ver|vou avaliar|me dá um tempo|preciso analisar|vou considerar|não tenho certeza|tenho que ver/i
      if (THINKING.test(messageText)) {
        const followupAt = new Date(Date.now() + 3 * 24 * 3600 * 1000)
        await supabase.from("leads").update({
          thinking_followup_at: followupAt.toISOString(),
        }).eq("id", lead.id)
      }
    })

    // 9. Se broker assumiu a conversa, não gerar resposta da Cora
    if (conversation.broker_took_over) {
      return { status: "broker_took_over", convId: conversation.id }
    }

    // 10. Verificar se é primeira interação (disclaimer LGPD M05G)
    const isFirstInteraction = await step.run("check-first-interaction", async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .eq("sender", "cora")
      return (count ?? 0) === 0
    })

    // 10. Buscar histórico da conversa (últimas 20 mensagens)
    const history = await step.run("fetch-history", async () => {
      const { data } = await supabase
        .from("messages")
        .select("content, sender")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(20)
      return (data ?? []).reverse().map((m) => ({
        role: (m.sender === "lead" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      }))
    })

    // 11. Agenda do corretor (Google Calendar) — contexto para evitar conflitos
    const calendarContext = await step.run("fetch-calendar-context", async () => {
      if (!broker.google_calendar_connected) return null
      const { getFreeSlots } = await import("@/lib/calendar/google")
      return getFreeSlots(supabase, broker.id)
    })

    // 12. Gerar resposta da Cora
    const systemPrompt = buildCoraSystemPrompt(
      brokerName,
      brokerPhone,
      (broker.cora_formality as "formal" | "informal") ?? "informal",
      broker.cora_custom_prompt ?? undefined,
      calendarContext,
      broker.cora_work_start ?? 8,
      broker.cora_work_end ?? 20
    )

    const coraResponse = await step.run("generate-cora-response", async () => {
      const disclaimer = isFirstInteraction
        ? `Oi! Aqui é a Cora, assistente do ${brokerName} pelo Moova. Atendo enquanto ele tá com outros clientes. Se quiser falar direto com ele, é só pedir — chamo na hora.\n\n`
        : ""

      const useAnthropicFallback = health.openai === "degraded"
      const response = await generateCoraResponse(
        systemPrompt,
        [...history, { role: "user", content: messageText }],
        useAnthropicFallback
      )

      return disclaimer + response
    })

    // 12. Checar se precisa de aprovação humana
    const requiresApproval = await step.run("check-approval", async () => {
      const now = Date.now()
      const onboardedAt = new Date(broker.created_at).getTime()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      const inCalibragem = now - onboardedAt < thirtyDaysMs

      if (!broker.human_approval_active) return { needed: false, category: null }

      // Após 30 dias, verifica por categoria
      const categories: Record<string, boolean> = broker.human_approval_categories ?? {
        visita: true, valor: true, contraproposta: true, fechamento: true, alto_valor: true,
      }

      if (inCalibragem) {
        const cat = detectApprovalCategory(coraResponse)
        if (cat && categories[cat]) return { needed: true, category: cat }
        // Alto valor: lead com budget > 50k
        if (lead.estimated_budget && lead.estimated_budget > 50000 && categories.alto_valor) {
          return { needed: true, category: "alto_valor" }
        }
      } else {
        const cat = detectApprovalCategory(coraResponse)
        if (cat && categories[cat]) return { needed: true, category: cat }
      }

      return { needed: false, category: null }
    })

    // 13. Salvar mensagem da Cora
    const coraMessage = await step.run("save-cora-message", async () => {
      const { data } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          lead_id: lead.id,
          user_id: broker.id,
          content: coraResponse,
          type: "text",
          sender: "cora",
          requires_approval: requiresApproval.needed,
          flags: [],
        })
        .select("id")
        .single()
      return data
    })

    // 14. Se precisa aprovação → enfileirar e encerrar
    if (requiresApproval.needed && coraMessage?.id) {
      await step.run("queue-approval", async () => {
        await supabase.from("human_approvals_queue").insert({
          user_id: broker.id,
          message_id: coraMessage.id,
          category: requiresApproval.category ?? "geral",
        })
      })
      return { status: "pending_approval", category: requiresApproval.category }
    }

    // 15. Enviar resposta pelo WhatsApp
    await step.run("send-response", async () => {
      const provider = createWhatsAppProvider((broker.provider ?? "evolution") as "evolution" | "bsp")
      await provider.sendMessage({ to: from, text: coraResponse })

      await supabase.from("messages")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", coraMessage?.id)
    })

    // 16. Atualizar contadores do diagnóstico
    await step.run("update-diagnostico", async () => {
      const { data: diag } = await supabase
        .from("diagnostico_cora_14d")
        .select("id, leads_attended, started_at")
        .eq("user_id", broker.id)
        .eq("converted_to_subscription", false)
        .gt("ends_at", new Date().toISOString())
        .single()

      if (!diag) return

      // Contar leads únicos atendidos (com contato dentro do diagnóstico)
      const { count: leadsCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", broker.id)
        .gte("last_contact_at", diag.started_at ?? new Date(0).toISOString())

      // Contar visitas agendadas desde o início do diagnóstico
      const { count: visitsCount } = await supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", broker.id)
        .gte("created_at", diag.started_at ?? new Date(0).toISOString())

      // Comissão estimada: leads QUENTE × 6%
      const { data: hotLeads } = await supabase
        .from("leads")
        .select("estimated_budget")
        .eq("user_id", broker.id)
        .eq("temperature", "QUENTE")
        .not("estimated_budget", "is", null)

      const estimatedCommission = (hotLeads ?? []).reduce(
        (sum, l) => sum + ((l.estimated_budget ?? 0) * 0.06), 0
      )

      await supabase.from("diagnostico_cora_14d").update({
        leads_attended: leadsCount ?? diag.leads_attended,
        leads_contacted: leadsCount ?? 0,
        visits_scheduled: visitsCount ?? 0,
        estimated_commission: estimatedCommission,
      }).eq("id", diag.id)
    })

    // 17. Audit log
    await step.run("audit-log", async () => {
      await supabase.from("audit_logs").insert({
        user_id: broker.id,
        action: "cora_message_sent",
        entity_type: "message",
        entity_id: coraMessage?.id,
        payload: { from, type, requires_approval: requiresApproval.needed },
      })
    })

    return { status: "ok", from, type, requiresApproval: requiresApproval.needed }
  }
)
