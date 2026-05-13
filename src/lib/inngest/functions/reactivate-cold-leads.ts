import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateCoraResponse, buildCoraSystemPrompt } from "@/lib/ai/cora"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

// Triggered manually or on a schedule to re-engage FRIO/INERTE leads silent for 7+ days
export const reactivateColdLeads = inngest.createFunction(
  {
    id: "reactivate-cold-leads",
    retries: 2,
    triggers: [{ cron: "0 9 * * 1" }], // Every Monday at 9am
  },
  async ({ step }) => {
    const supabase = createAdminClient()

    const leads = await step.run("fetch-cold-leads", async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data } = await supabase
        .from("leads")
        .select(`
          id, name, user_id, phone, temperature, status,
          conversations(id, broker_took_over, messages(content, created_at, sender))
        `)
        .in("temperature", ["FRIO", "INERTE"])
        .not("status", "in", "(fechou,perdido)")
        .limit(50)

      return (data ?? []).filter((lead) => {
        const convs = lead.conversations as any[]
        if (!convs?.length) return true
        const allMessages = convs.flatMap((c) => c.messages ?? [])
        if (!allMessages.length) return true
        const latest = allMessages.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        return new Date(latest.created_at) < sevenDaysAgo
      })
    })

    if (!leads.length) return { reactivated: 0 }

    let reactivated = 0

    for (const lead of leads) {
      await step.run(`reactivate-${lead.id}`, async () => {
        const { data: waAccount } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", lead.user_id)
          .single()

        if (!waAccount?.instance_name) return

        const { data: userRow } = await supabase
          .from("users")
          .select("broker_name, cora_formality, cora_custom_prompt")
          .eq("id", lead.user_id)
          .single()

        const systemPrompt = buildCoraSystemPrompt(
          userRow?.broker_name ?? "o corretor",
          "",
          (userRow?.cora_formality as "formal" | "informal") ?? "informal",
          userRow?.cora_custom_prompt ?? ""
        )

        const message = await generateCoraResponse(
          systemPrompt,
          [{
            role: "user",
            content: `[SISTEMA] Reativar lead ${lead.name} que está ${lead.temperature} há mais de 7 dias. Envie uma mensagem de reengajamento calorosa e não invasiva.`,
          }]
        )

        const providerType = (waAccount.provider ?? "evolution") as "evolution" | "bsp"
        const provider = createWhatsAppProvider(providerType)
        await provider.sendMessage({
          to: lead.phone,
          text: message,
        })

        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("lead_id", lead.id)
          .single()

        if (conv) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            content: message,
            sender: "cora",
            user_id: lead.user_id,
          })
        }
      })
      reactivated++
    }

    return { reactivated }
  }
)
