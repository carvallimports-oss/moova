import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { pactoMarcoEmail, pactoVeredito90Email } from "@/lib/email/templates"

export const sendPactoMarco = inngest.createFunction(
  {
    id: "send-pacto-marco",
    retries: 3,
    triggers: [{ event: "pacto/marco.due" }],
  },
  async ({ event, step }) => {
    const { userId, pactoId, dayNumber } = event.data as {
      userId: string
      pactoId: string
      dayNumber: 30 | 45 | 75 | 90
    }

    const supabase = createAdminClient()

    const context = await step.run("fetch-context", async () => {
      const { data: pacto } = await supabase
        .from("pacto_moova_90_audit")
        .select("commission_achieved, good_faith_score, ends_at")
        .eq("id", pactoId)
        .single()

      const { data: user } = await supabase
        .from("users")
        .select("broker_name, name, email")
        .eq("id", userId)
        .single()

      return { pacto, user }
    })

    const { pacto, user } = context
    if (!pacto || !user) return { skipped: true }

    const brokerName = user.broker_name ?? user.name ?? "Corretor"
    const meta = 50000
    const comissao = Number(pacto.commission_achieved)
    const goodFaith = Number(pacto.good_faith_score)
    const falta = Math.max(0, meta - comissao)
    const diasRestantes = Math.ceil((new Date(pacto.ends_at).getTime() - Date.now()) / 86400000)

    const messages: Record<number, string> = {
      30: `Primeiro mês do Pacto Moova 90! A Cora ainda está em calibragem. Aprovação humana obrigatória é normal nessa fase.`,
      45: `Metade do Pacto! Comissão acumulada: R$ ${comissao.toLocaleString("pt-BR")}. Faltam R$ ${falta.toLocaleString("pt-BR")} para a meta. Continue acompanhando no dashboard.`,
      75: `Reta final! Faltam ${diasRestantes} dias e R$ ${falta.toLocaleString("pt-BR")} para a meta de R$ 50k. A Cora está acelerando.`,
      90: `Pacto Moova 90 concluído! Resultado: R$ ${comissao.toLocaleString("pt-BR")}. O veredito será enviado por email em até 24h úteis pela equipe Moova.`,
    }

    const messageContent = messages[dayNumber]

    await step.run("save-marco", () =>
      supabase.from("pacto_moova_90_marcos").upsert({
        pacto_id: pactoId,
        user_id: userId,
        day_number: dayNumber,
        sent_at: new Date().toISOString(),
        message_content: messageContent,
      }, { onConflict: "pacto_id,day_number" })
    )

    if (user.email) {
      if (dayNumber === 90) {
        // Calcular cenário e emitir veredito institucional (fala Moova)
        await step.run("send-veredito-email", async () => {
          const scenario = comissao >= meta ? "A"
            : goodFaith >= 80 ? "B"
            : goodFaith >= 50 ? "C"
            : "D"

          const refundMap: Record<string, number> = {
            A: 0,
            B: 799 * 3 * 0.7,  // 70% de 3 mensalidades
            C: 799 * 3 * 0.35,
            D: 0,
          }
          const refundAmount = refundMap[scenario]

          // Atualizar cenário no banco
          await supabase.from("pacto_moova_90_audit").update({
            scenario,
            refund_amount: refundAmount,
            resolved_at: new Date().toISOString(),
          }).eq("id", pactoId)

          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pacto`
          const { subject, html } = pactoVeredito90Email({
            brokerName,
            scenario: scenario as "A" | "B" | "C" | "D",
            refundAmount,
            dashboardUrl,
          })
          await sendEmail({ to: user.email!, subject, html })
        })
      } else {
        await step.run("send-marco-email", async () => {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pacto`
          const { subject, html } = pactoMarcoEmail({
            brokerName,
            dayNumber,
            messageContent,
            commissionAchieved: comissao,
            meta,
            goodFaithScore: goodFaith,
            dashboardUrl,
          })
          await sendEmail({ to: user.email!, subject, html })
        })
      }
    }

    return { userId, dayNumber, messageContent }
  }
)

// Cron que verifica marcos do Pacto a cada hora
export const checkPactoMarcos = inngest.createFunction(
  {
    id: "check-pacto-marcos",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient()

    const pactos = await step.run("fetch-active-pactos", async () => {
      const { data } = await supabase
        .from("pacto_moova_90_audit")
        .select("id, user_id, started_at")
        .is("resolved_at", null)
        .gt("ends_at", new Date().toISOString())
      return data as { id: string; user_id: string; started_at: string }[] | null
    })

    const events: { name: string; data: object }[] = []

    for (const pacto of pactos ?? []) {
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(pacto.started_at).getTime()) / 86400000
      )

      const { data: existingMarcos } = await supabase
        .from("pacto_moova_90_marcos")
        .select("day_number")
        .eq("pacto_id", pacto.id)

      const sent = new Set((existingMarcos ?? []).map((m: { day_number: number }) => m.day_number))

      for (const day of [30, 45, 75, 90] as const) {
        if (daysSinceStart >= day && !sent.has(day)) {
          events.push({
            name: "pacto/marco.due",
            data: { userId: pacto.user_id, pactoId: pacto.id, dayNumber: day },
          })
        }
      }
    }

    if (events.length > 0) {
      await step.run("send-events", () => inngest.send(events))
    }

    return { checked: pactos?.length ?? 0, eventsSent: events.length }
  }
)
