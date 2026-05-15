import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateCoraResponse, buildCoraSystemPrompt } from "@/lib/ai/cora"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

// Sequência M05B: 3 mensagens com espaçamento 2-5 dias para leads frios
// Step 0 → 1: mensagem calorosa (dia 0) → next_at +3 dias
// Step 1 → 2: light follow-up (dia 3)   → next_at +5 dias
// Step 2 → 0: última tentativa (dia 8), lead passa a INERTE

const STEP_PROMPTS = [
  (name: string) =>
    `[SISTEMA] Reativar lead ${name} que está frio há mais de 7 dias sem contato. Primeira mensagem da sequência: abordagem calorosa e sem pressão, pergunte se ainda está procurando.`,
  (name: string) =>
    `[SISTEMA] Segunda mensagem de reativação para ${name} (3 dias após a primeira). Tom ainda mais leve. Mencione que surgiu novidade no portfólio ou que o mercado está favorável agora.`,
  (name: string) =>
    `[SISTEMA] Terceira e última mensagem de reativação para ${name} (8 dias após a primeira). Seja breve e respeitoso. Diga que não quer ser insistente mas estará disponível quando precisar.`,
]

const NEXT_DAYS = [3, 5] // dias até próxima mensagem da sequência

export const reactivateColdLeads = inngest.createFunction(
  {
    id: "reactivate-cold-leads",
    retries: 2,
    triggers: [{ cron: "0 9 * * *" }], // diário às 9h (era só segunda)
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

    // ── Sequência: step > 0 e next_at passou ─────────────────────────────────
    const inSequence = await step.run("fetch-in-sequence", async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          id, name, phone, user_id, reactivation_step, temperature,
          users!leads_user_id_fkey(broker_name, name, phone, cora_formality, cora_custom_prompt)
        `)
        .gt("reactivation_step", 0)
        .lte("reactivation_next_at", now.toISOString())
        .not("status", "in", "(fechou,perdido)")
        .is("lgpd_optout_at", null)
      return (data ?? []) as unknown as Array<{
        id: string; name: string; phone: string; user_id: string
        reactivation_step: number; temperature: string | null
        users: { broker_name: string | null; name: string; phone: string; cora_formality: string | null; cora_custom_prompt: string | null } | null
      }>
    })

    // ── Novos candidatos: frios há 7+ dias, step = 0 ─────────────────────────
    const newCandidates = await step.run("fetch-new-cold-leads", async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          id, name, phone, user_id,
          conversations(id, messages(created_at, sender)),
          users!leads_user_id_fkey(broker_name, name, phone, cora_formality, cora_custom_prompt)
        `)
        .in("temperature", ["FRIO", "INERTE"])
        .not("status", "in", "(fechou,perdido)")
        .eq("reactivation_step", 0)
        .is("lgpd_optout_at", null)
        .limit(30)

      return ((data ?? []) as unknown as Array<{
        id: string; name: string; phone: string; user_id: string
        conversations: Array<{ id: string; messages: Array<{ created_at: string; sender: string }> }>
        users: { broker_name: string | null; name: string; phone: string; cora_formality: string | null; cora_custom_prompt: string | null } | null
      }>).filter((lead) => {
        const allMessages = lead.conversations.flatMap((c) => c.messages ?? [])
        if (!allMessages.length) return true
        const latest = allMessages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        return new Date(latest.created_at) < sevenDaysAgo
      })
    })

    const allLeads = [
      ...inSequence.map((l) => ({ ...l, isNew: false })),
      ...newCandidates.map((l) => ({ ...l, reactivation_step: 0, temperature: null, isNew: true })),
    ]

    if (!allLeads.length) return { reactivated: 0, sequences: 0 }

    let reactivated = 0

    for (const lead of allLeads) {
      const currentStep = lead.reactivation_step

      await step.run(`reactivate-step${currentStep}-${lead.id}`, async () => {
        const { data: waAccount } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", lead.user_id)
          .single()

        if (!waAccount?.instance_name) return

        const broker = lead.users
        const systemPrompt = buildCoraSystemPrompt(
          broker?.broker_name ?? broker?.name ?? "o corretor",
          broker?.phone ?? "",
          (broker?.cora_formality as "formal" | "informal") ?? "informal",
          broker?.cora_custom_prompt ?? undefined
        )

        const promptFn = STEP_PROMPTS[currentStep] ?? STEP_PROMPTS[2]
        const message = await generateCoraResponse(systemPrompt, [{
          role: "user",
          content: promptFn(lead.name),
        }])

        const provider = createWhatsAppProvider((waAccount.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({ to: lead.phone, text: message })

        const nextStep = currentStep + 1
        const isLastStep = nextStep >= STEP_PROMPTS.length

        await supabase.from("leads").update({
          reactivation_step: isLastStep ? 0 : nextStep,
          reactivation_next_at: isLastStep
            ? null
            : new Date(now.getTime() + NEXT_DAYS[currentStep] * 24 * 3600 * 1000).toISOString(),
          temperature: isLastStep ? "INERTE" : undefined,
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
            content: message,
            type: "text",
            sender: "cora",
            flags: [`reactivation_step_${currentStep}`],
          })
        }
      })
      reactivated++
    }

    // Update diagnostico cold_leads_reactivated counters per broker
    if (reactivated > 0) {
      await step.run("update-diagnostico-counters", async () => {
        // Group by user_id
        const byUser = new Map<string, number>()
        for (const l of allLeads) {
          byUser.set(l.user_id, (byUser.get(l.user_id) ?? 0) + 1)
        }
        for (const [userId, count] of byUser) {
          const { data: diag } = await supabase
            .from("diagnostico_cora_14d")
            .select("id, cold_leads_reactivated")
            .eq("user_id", userId)
            .eq("converted_to_subscription", false)
            .gt("ends_at", now.toISOString())
            .single()
          if (diag) {
            await supabase
              .from("diagnostico_cora_14d")
              .update({ cold_leads_reactivated: (diag.cold_leads_reactivated ?? 0) + count })
              .eq("id", diag.id)
          }
        }
      })
    }

    return { reactivated, sequences: inSequence.length, newCandidates: newCandidates.length }
  }
)
