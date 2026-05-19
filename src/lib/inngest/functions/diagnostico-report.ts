import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { diagnosticoReportEmail } from "@/lib/email/templates"

// Triggered on day 14 of a broker's diagnostico to generate and send the final report
export const generateDiagnosticoReport = inngest.createFunction(
  {
    id: "generate-diagnostico-report",
    retries: 2,
    triggers: [{ event: "diagnostico/day14.completed" }],
  },
  async ({ event, step }) => {
    const { userId, diagnosticoId } = event.data as { userId: string; diagnosticoId: string }
    const supabase = createAdminClient()

    const stats = await step.run("compute-stats", async () => {
      const [{ data: user }, { data: diag }] = await Promise.all([
        supabase.from("users").select("broker_name, email").eq("id", userId).single(),
        supabase.from("diagnostico_nara_14d").select("started_at").eq("id", diagnosticoId).single(),
      ])

      const startedAt = diag?.started_at ?? new Date(Date.now() - 14 * 86400000).toISOString()

      const { count: leadsContacted } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("last_contact_at", startedAt)

      const { count: visitsScheduled } = await supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startedAt)

      const { count: hotLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("temperature", "QUENTE")

      const { data: budgetData } = await supabase
        .from("leads")
        .select("estimated_budget")
        .eq("user_id", userId)
        .eq("temperature", "QUENTE")
        .not("estimated_budget", "is", null)

      const estimatedCommission = (budgetData ?? []).reduce((sum, l) => {
        return sum + ((l.estimated_budget ?? 0) * 0.06)
      }, 0)

      return {
        brokerName: user?.broker_name ?? "Corretor",
        email: user?.email,
        leadsContacted: leadsContacted ?? 0,
        visitsScheduled: visitsScheduled ?? 0,
        hotLeads: hotLeads ?? 0,
        estimatedCommission,
      }
    })

    // Persist final stats on diagnostico record
    await step.run("persist-stats", async () => {
      await supabase
        .from("diagnostico_nara_14d")
        .update({
          completed_at: new Date().toISOString(),
          leads_contacted: stats.leadsContacted,
          visits_scheduled: stats.visitsScheduled,
          estimated_commission: stats.estimatedCommission,
        })
        .eq("id", diagnosticoId)
    })

    // Send email report
    if (stats.email) {
      await step.run("send-report-email", async () => {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/relatorio`
        const { subject, html } = diagnosticoReportEmail({
          brokerName: stats.brokerName,
          leadsContacted: stats.leadsContacted,
          visitsScheduled: stats.visitsScheduled,
          hotLeads: stats.hotLeads,
          estimatedCommission: stats.estimatedCommission,
          dashboardUrl,
        })
        await sendEmail({ to: stats.email!, subject, html })
      })
    }

    return {
      userId,
      leadsContacted: stats.leadsContacted,
      visitsScheduled: stats.visitsScheduled,
      estimatedCommission: stats.estimatedCommission,
    }
  }
)
