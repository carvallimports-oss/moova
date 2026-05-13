import { inngest } from "../client"
import { checkAIHealth } from "@/lib/ai/cora"
import { createClient } from "@supabase/supabase-js"

// Roda a cada 30 segundos via cron — detecta modo degradado
export const aiHealthCheck = inngest.createFunction(
  {
    id: "ai-health-check",
    triggers: [{ cron: "*/1 * * * *" }], // a cada 1 min (Inngest free tier mínimo)
  },
  async ({ step }) => {
    const health = await step.run("check-health", () => checkAIHealth())

    if (!health.anyAvailable) {
      await step.run("register-incident", async () => {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await supabase.from("fallback_incidents").insert({
          openai_status: health.openai,
          anthropic_status: health.anthropic,
          started_at: new Date().toISOString(),
        })
      })

      // TODO: enviar push + SMS + email para todos os corretores afetados
    }

    return { health, timestamp: new Date().toISOString() }
  }
)
