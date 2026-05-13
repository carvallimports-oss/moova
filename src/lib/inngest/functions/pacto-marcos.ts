import { inngest } from "../client"
import { createClient } from "@supabase/supabase-js"

// Arco narrativo 3 atos do Pacto Moova 90
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const pacto = await step.run("fetch-pacto", async () => {
      const res = await supabase
        .from("pacto_moova_90_audit")
        .select("commission_achieved, good_faith_score, ends_at")
        .eq("id", pactoId)
        .single()
      return res.data as { commission_achieved: number; good_faith_score: number; ends_at: string } | null
    })

    if (!pacto) return { skipped: true }

    const meta = 50000 // R$ 50k meta do Pacto
    const comissao = Number(pacto.commission_achieved)
    const falta = Math.max(0, meta - comissao)
    const diasRestantes = Math.ceil((new Date(pacto.ends_at).getTime() - Date.now()) / 86400000)

    const messages: Record<number, string> = {
      30: `Primeiro mês do Pacto Moova 90! A Cora ainda está em calibragem. Aprovação humana obrigatória é normal nessa fase.`,
      45: `Metade do Pacto! Comissão acumulada: R$ ${comissao.toLocaleString("pt-BR")}. Faltam R$ ${falta.toLocaleString("pt-BR")} para a meta. Continue acompanhando no dashboard.`,
      75: `Reta final! Faltam ${diasRestantes} dias e R$ ${falta.toLocaleString("pt-BR")} para a meta de R$ 50k. A Cora está acelerando.`,
      90: `Pacto Moova 90 concluído! Seu resultado: R$ ${comissao.toLocaleString("pt-BR")}. O veredito será enviado por email em até 24h úteis pela Moova.`,
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

    // TODO: push + email (Cora nos marcos do dia a dia, Moova no veredito dia 90)
    return { userId, dayNumber, messageContent }
  }
)
