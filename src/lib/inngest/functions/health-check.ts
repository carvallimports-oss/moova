import { inngest } from "../client"
import { checkAIHealth } from "@/lib/ai/cora"
import { createAdminClient } from "@/lib/supabase/admin"

export const aiHealthCheck = inngest.createFunction(
  {
    id: "ai-health-check",
    triggers: [{ cron: "*/1 * * * *" }],
  },
  async ({ step }) => {
    const health = await step.run("check-health", () => checkAIHealth())

    if (!health.anyAvailable) {
      const supabase = createAdminClient()

      await step.run("register-incident", async () => {
        await supabase.from("fallback_incidents").insert({
          openai_status: health.openai,
          anthropic_status: health.anthropic,
          started_at: new Date().toISOString(),
          affected_conversations: 0,
        })
      })

      await step.run("notify-brokers", async () => {
        await inngest.send({
          name: "ai/degraded.detected",
          data: { affectedLeads: 0, incidentAt: new Date().toISOString() },
        })
      })
    }

    return { health, timestamp: new Date().toISOString() }
  }
)
