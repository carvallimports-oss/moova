import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { modoDesgradadoAlertEmail } from "@/lib/email/templates"

// Triggered when both OpenAI and Anthropic fail — notify broker via email
export const notifyDegradedMode = inngest.createFunction(
  {
    id: "notify-degraded-mode",
    retries: 3,
    triggers: [{ event: "ai/degraded.detected" }],
  },
  async ({ event, step }) => {
    const { affectedLeads = 0, incidentAt } = event.data as {
      affectedLeads?: number
      incidentAt: string
    }

    const supabase = createAdminClient()

    // Get all active brokers to notify
    const brokers = await step.run("fetch-active-brokers", async () => {
      const { data } = await supabase
        .from("users")
        .select("id, email, broker_name")
        .not("email", "is", null)

      return data ?? []
    })

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    const incidentFormatted = new Date(incidentAt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

    await step.run("send-notifications", async () => {
      for (const broker of brokers) {
        if (!broker.email) continue
        const { subject, html } = modoDesgradadoAlertEmail({
          brokerName: broker.broker_name ?? "Corretor",
          incidentAt: incidentFormatted,
          affectedLeads,
          dashboardUrl,
        })
        try {
          await sendEmail({ to: broker.email, subject, html })
        } catch (err) {
          console.error(`[notify-degraded] Failed to email ${broker.email}:`, err)
        }
      }
    })

    return { notified: brokers.length }
  }
)
