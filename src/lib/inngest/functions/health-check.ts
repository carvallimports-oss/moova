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
    const supabase = createAdminClient()

    if (!health.anyAvailable) {
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
    } else {
      // Resolve any open incidents now that AI is back
      await step.run("resolve-open-incidents", async () => {
        await supabase
          .from("fallback_incidents")
          .update({ resolved_at: new Date().toISOString() })
          .is("resolved_at", null)
      })
    }

    return { health, timestamp: new Date().toISOString() }
  }
)
