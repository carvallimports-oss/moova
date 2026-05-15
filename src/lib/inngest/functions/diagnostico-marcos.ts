import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { diagnosticoMarcoEmail } from "@/lib/email/templates"

export const sendDiagnosticoMarco = inngest.createFunction(
  {
    id: "send-diagnostico-marco",
    retries: 3,
    triggers: [{ event: "diagnostico/marco.due" }],
  },
  async ({ event, step }) => {
    const { userId, diagnosticoId, dayNumber } = event.data as {
      userId: string
      diagnosticoId: string
      dayNumber: 3 | 7 | 11 | 14
    }

    const supabase = createAdminClient()

    const context = await step.run("fetch-context", async () => {
      const { data: diag } = await supabase
        .from("diagnostico_cora_14d")
        .select("leads_attended, cold_leads_reactivated, visits_scheduled, estimated_commission")
        .eq("id", diagnosticoId)
        .single()

      const { data: user } = await supabase
        .from("users")
        .select("broker_name, name, email")
        .eq("id", userId)
        .single()

      return { diag, user }
    })

    const { diag, user } = context
    if (!diag || !user) return { skipped: true }

    const brokerName = user.broker_name ?? user.name ?? "Corretor"
    const commission = Number(diag.estimated_commission)

    const messages: Record<number, string> = {
      3: `Cora está rodando há 3 dias. Já atendeu ${diag.leads_attended} leads. Como tá sendo a experiência?`,
      7: `Uma semana com a Cora! ${diag.visits_scheduled} visitas agendadas, ${diag.cold_leads_reactivated} frios reativados. Você está na metade do Diagnóstico.`,
      11: `Faltam 3 dias. Projeção: R$ ${commission.toLocaleString("pt-BR")} em comissão potencial. Prepare-se para o relatório final.`,
      14: `Diagnóstico concluído! Veja o relatório completo no dashboard. A Cora está pronta para continuar — conheça o Pacto Moova 90.`,
    }

    const messageContent = messages[dayNumber]

    await step.run("save-marco", () =>
      supabase.from("diagnostico_cora_marcos").upsert({
        diagnostico_id: diagnosticoId,
        user_id: userId,
        day_number: dayNumber,
        sent_at: new Date().toISOString(),
        message_content: messageContent,
      }, { onConflict: "diagnostico_id,day_number" })
    )

    if (user.email) {
      await step.run("send-email", async () => {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/relatorio`
        const { subject, html } = diagnosticoMarcoEmail({
          brokerName,
          dayNumber,
          messageContent,
          leadsAttended: diag.leads_attended,
          visitsScheduled: diag.visits_scheduled,
          estimatedCommission: commission,
          dashboardUrl,
        })
        await sendEmail({ to: user.email!, subject, html })
      })
    }

    return { userId, dayNumber, messageContent }
  }
)

export const checkDiagnosticoMarcos = inngest.createFunction(
  {
    id: "check-diagnostico-marcos",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient()

    const diagnosticos = await step.run("fetch-active", async () => {
      const { data } = await supabase
        .from("diagnostico_cora_14d")
        .select("id, user_id, started_at")
        .eq("converted_to_subscription", false)
        .gt("ends_at", new Date().toISOString())
      return data as { id: string; user_id: string; started_at: string }[] | null
    })

    const events: { name: string; data: object }[] = []

    for (const diag of diagnosticos ?? []) {
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(diag.started_at).getTime()) / 86400000
      )

      const { data: existingMarcos } = await supabase
        .from("diagnostico_cora_marcos")
        .select("day_number")
        .eq("diagnostico_id", diag.id)

      const sent = new Set((existingMarcos ?? []).map((m: { day_number: number }) => m.day_number))

      for (const day of [3, 7, 11, 14] as const) {
        if (daysSinceStart >= day && !sent.has(day)) {
          events.push({
            name: "diagnostico/marco.due",
            data: { userId: diag.user_id, diagnosticoId: diag.id, dayNumber: day },
          })
        }
      }
    }

    if (events.length > 0) {
      await step.run("send-events", () => inngest.send(events))
    }

    return { checked: diagnosticos?.length ?? 0, eventsSent: events.length }
  }
)
