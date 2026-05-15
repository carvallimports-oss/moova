import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyLead } from "@/lib/ai/classify-lead"

// Triggered after bulk import — classifies each unclassified lead
export const classifyImportedLeads = inngest.createFunction(
  {
    id: "classify-imported-leads",
    retries: 2,
    concurrency: { limit: 5 },
    triggers: [{ event: "leads/imported" }],
  },
  async ({ event, step }) => {
    const { userId, leadIds } = event.data as { userId: string; leadIds: string[] }
    const supabase = createAdminClient()

    let classified = 0
    let failed = 0

    for (const leadId of leadIds) {
      await step.run(`classify-${leadId}`, async () => {
        const { data: lead } = await supabase
          .from("leads")
          .select("id, name, estimated_budget, region, notes, temperature")
          .eq("id", leadId)
          .eq("user_id", userId)
          .single()

        if (!lead || lead.temperature) return // já classificado

        const { data: messages } = await supabase
          .from("messages")
          .select("content")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(20)

        const history = (messages ?? []).map((m) => m.content)

        try {
          const result = await classifyLead({
            name: lead.name,
            messageHistory: history,
            estimatedBudget: lead.estimated_budget,
            region: lead.region ?? undefined,
            notes: lead.notes ?? undefined,
          })

          await supabase.from("leads").update({
            temperature: result.temperature,
            next_action: result.nextAction,
          }).eq("id", leadId)

          classified++
        } catch {
          failed++
        }
      })
    }

    // Atualizar comissão estimada no diagnóstico
    await step.run("update-diagnostico-commission", async () => {
      const { data: diag } = await supabase
        .from("diagnostico_cora_14d")
        .select("id")
        .eq("user_id", userId)
        .eq("converted_to_subscription", false)
        .gt("ends_at", new Date().toISOString())
        .single()

      if (!diag) return

      const { data: hotLeads } = await supabase
        .from("leads")
        .select("estimated_budget")
        .eq("user_id", userId)
        .eq("temperature", "QUENTE")
        .not("estimated_budget", "is", null)

      const estimatedCommission = (hotLeads ?? []).reduce(
        (sum, l) => sum + ((l.estimated_budget ?? 0) * 0.06), 0
      )

      await supabase.from("diagnostico_cora_14d")
        .update({ estimated_commission: estimatedCommission })
        .eq("id", diag.id)
    })

    return { classified, failed, total: leadIds.length }
  }
)
