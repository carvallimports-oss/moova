import { inngest } from "../client"
import { createClient } from "@supabase/supabase-js"

// Arco narrativo 3 atos do Diagnóstico Cora 14 Dias
// Triggers: evento disparado quando marco é atingido
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Busca dados do diagnóstico
    const diagResult = await step.run("fetch-diagnostico", async () => {
      const res = await supabase
        .from("diagnostico_cora_14d")
        .select("leads_attended, cold_leads_reactivated, visits_scheduled, estimated_commission")
        .eq("id", diagnosticoId)
        .single()
      return res.data
    })

    const diag = diagResult as { leads_attended: number; cold_leads_reactivated: number; visits_scheduled: number; estimated_commission: number } | null
    if (!diag) return { skipped: true }

    // Mensagem por ato narrativo
    const messages: Record<number, string> = {
      3: `Cora está rodando há 3 dias. Já atendeu ${diag.leads_attended} leads. Como tá sendo a experiência?`,
      7: `Uma semana com a Cora! ${diag.visits_scheduled} visitas agendadas, ${diag.cold_leads_reactivated} frios reativados. Você está na metade do Diagnóstico.`,
      11: `Faltam 3 dias. Projeção: R$ ${Number(diag.estimated_commission).toLocaleString("pt-BR")} em comissão potencial. Prepare-se para o relatório final.`,
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

    // TODO: enviar push notification + email com o marco
    return { userId, dayNumber, messageContent }
  }
)

// Cron que verifica marcos pendentes toda hora
export const checkDiagnosticoMarcos = inngest.createFunction(
  {
    id: "check-diagnostico-marcos",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Diagnósticos ativos
    const diagnosticos = await step.run("fetch-active", async () => {
      const res = await supabase
        .from("diagnostico_cora_14d")
        .select("id, user_id, started_at")
        .eq("converted_to_subscription", false)
        .gt("ends_at", new Date().toISOString())
      return res.data as { id: string; user_id: string; started_at: string }[] | null
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

    // Enfileira eventos de marco pendentes
    if (events.length > 0) {
      await step.run("send-events", async () => {
        const { Inngest } = await import("inngest")
        const client = new Inngest({ id: "moova" })
        await client.send(events)
      })
    }

    return { checked: diagnosticos?.length ?? 0, eventsSent: events.length }
  }
)
