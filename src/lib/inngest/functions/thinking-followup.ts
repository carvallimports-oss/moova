import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildCoraSystemPrompt, generateCoraResponse } from "@/lib/ai/cora"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

// Cron diário 9h: retomada de leads que disseram "vou pensar" há 3 dias
export const thinkingFollowup = inngest.createFunction(
  {
    id: "thinking-followup",
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()

    const leads = await step.run("fetch-thinking-leads", async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          id, name, phone, user_id, status,
          users!leads_user_id_fkey(broker_name, name, phone, cora_formality, cora_custom_prompt)
        `)
        .lte("thinking_followup_at", now.toISOString())
        .not("status", "in", "(fechou,perdido)")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[]
    })

    if (!leads.length) return { sent: 0 }

    let sent = 0

    for (const lead of leads) {
      await step.run(`thinking-followup-${lead.id}`, async () => {
        const broker = lead.users
        if (!broker) return

        const brokerName = broker.broker_name ?? broker.name

        const { data: wa } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", lead.user_id)
          .single()

        if (!wa?.instance_name) return

        const systemPrompt = buildCoraSystemPrompt(
          brokerName,
          broker.phone,
          (broker.cora_formality as "formal" | "informal") ?? "informal",
          broker.cora_custom_prompt ?? undefined
        )

        const msg = await generateCoraResponse(systemPrompt, [{
          role: "user",
          content: `[SISTEMA] O lead ${lead.name} disse que ia pensar há 3 dias e ainda não retornou. Envie uma mensagem de retomada leve e não invasiva — sem pressão. Seja caloroso e ofereça ajuda para tirar dúvidas.`,
        }])

        const provider = createWhatsAppProvider((wa.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({ to: lead.phone, text: msg })

        // Limpa o followup e registra contato
        await supabase.from("leads").update({
          thinking_followup_at: null,
          last_contact_at: now.toISOString(),
        }).eq("id", lead.id)

        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("user_id", lead.user_id)
          .eq("is_active", true)
          .single()

        if (conv) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            lead_id: lead.id,
            user_id: lead.user_id,
            content: msg,
            type: "text",
            sender: "cora",
            flags: ["thinking_followup"],
          })
        }
      })
      sent++
    }

    return { sent }
  }
)
