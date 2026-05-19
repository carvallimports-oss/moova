import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"
import { buildNaraSystemPrompt, generateNaraResponse } from "@/lib/ai/nara"

// Cron a cada 30min: lembrete 24h antes + follow-up 2h depois
export const visitReminders = inngest.createFunction(
  {
    id: "visit-reminders",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()

    // ── 24h antes da visita ──────────────────────────────────────────────────
    const upcoming = await step.run("fetch-upcoming-visits", async () => {
      const in24h = new Date(now.getTime() + 24 * 3600 * 1000)
      const in25h = new Date(now.getTime() + 25 * 3600 * 1000)
      const { data } = await supabase
        .from("visits")
        .select(`
          id, scheduled_at, user_id, address,
          leads(id, name, phone),
          users!visits_user_id_fkey(broker_name, name, phone, nara_formality, nara_custom_prompt)
        `)
        .gte("scheduled_at", in24h.toISOString())
        .lte("scheduled_at", in25h.toISOString())
        .eq("reminder_24h_sent", false)
        .in("status", ["pendente", "confirmada"])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[]
    })

    let reminders24h = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const visit of upcoming as any[]) {
      if (!visit.leads?.phone || !visit.users) continue
      await step.run(`reminder-24h-${visit.id}`, async () => {
        const broker = visit.users
        const brokerName = broker.broker_name ?? broker.name
        const dt = new Date(visit.scheduled_at)
        const timeStr = dt.toLocaleString("pt-BR", {
          weekday: "long", day: "2-digit", month: "long",
          hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
        })
        const addressNote = visit.address ? ` — endereço: ${visit.address}` : ""
        const msg = `Oi ${visit.leads!.name}! Passando pra confirmar nossa visita de amanhã: ${timeStr}${addressNote}. Tudo certo por aí?`

        const { data: wa } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", visit.user_id)
          .single()

        if (!wa?.instance_name) return

        const provider = createWhatsAppProvider((wa.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({ to: visit.leads!.phone, text: msg })
        await supabase.from("visits").update({ reminder_24h_sent: true }).eq("id", visit.id)
        await supabase.from("messages").insert({
          conversation_id: await getOrCreateConvId(supabase, visit.user_id, visit.leads!.id),
          lead_id: visit.leads!.id,
          user_id: visit.user_id,
          content: msg,
          type: "text",
          sender: "nara",
          flags: [],
        })
      })
      reminders24h++
    }

    // ── Follow-up 2h depois da visita ────────────────────────────────────────
    const past = await step.run("fetch-past-visits", async () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000)
      const twoAndHalfHoursAgo = new Date(now.getTime() - 2.5 * 3600 * 1000)
      const { data } = await supabase
        .from("visits")
        .select(`
          id, scheduled_at, user_id,
          leads(id, name, phone),
          users!visits_user_id_fkey(broker_name, name, phone, nara_formality, nara_custom_prompt)
        `)
        .gte("scheduled_at", twoAndHalfHoursAgo.toISOString())
        .lte("scheduled_at", twoHoursAgo.toISOString())
        .eq("follow_up_sent", false)
        .in("status", ["confirmada", "realizada"])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[]
    })

    let followUps = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const visit of past as any[]) {
      if (!visit.leads?.phone || !visit.users) continue
      await step.run(`follow-up-${visit.id}`, async () => {
        const broker = visit.users
        const brokerName = broker.broker_name ?? broker.name
        const systemPrompt = buildNaraSystemPrompt(
          brokerName, broker.phone,
          (broker.nara_formality as "formal" | "informal") ?? "informal",
          broker.nara_custom_prompt ?? undefined
        )
        const followUpMsg = await generateNaraResponse(systemPrompt, [{
          role: "user",
          content: `[SISTEMA] O lead ${visit.leads!.name} acabou de fazer uma visita ao imóvel há 2 horas. Envie uma mensagem calorosa perguntando como foi, se gostou e se tem dúvidas. Seja direto e não seja invasivo.`,
        }])

        const { data: wa } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", visit.user_id)
          .single()

        if (!wa?.instance_name) return

        const provider = createWhatsAppProvider((wa.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({ to: visit.leads!.phone, text: followUpMsg })
        await supabase.from("visits").update({ follow_up_sent: true, status: "realizada" }).eq("id", visit.id)
        await supabase.from("messages").insert({
          conversation_id: await getOrCreateConvId(supabase, visit.user_id, visit.leads!.id),
          lead_id: visit.leads!.id,
          user_id: visit.user_id,
          content: followUpMsg,
          type: "text",
          sender: "nara",
          flags: [],
        })
      })
      followUps++
    }

    // ── 1h antes da visita ───────────────────────────────────────────────────
    const upcoming1h = await step.run("fetch-1h-visits", async () => {
      const in1h = new Date(now.getTime() + 1 * 3600 * 1000)
      const in90min = new Date(now.getTime() + 1.5 * 3600 * 1000)
      const { data } = await supabase
        .from("visits")
        .select(`
          id, scheduled_at, user_id, address,
          leads(id, name, phone),
          users!visits_user_id_fkey(broker_name, name, phone)
        `)
        .gte("scheduled_at", in1h.toISOString())
        .lte("scheduled_at", in90min.toISOString())
        .eq("reminder_1h_sent", false)
        .in("status", ["pendente", "confirmada"])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[]
    })

    let reminders1h = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const visit of upcoming1h as any[]) {
      if (!visit.leads?.phone || !visit.users) continue
      await step.run(`reminder-1h-${visit.id}`, async () => {
        const broker = visit.users
        const brokerName = broker.broker_name ?? broker.name
        const dt = new Date(visit.scheduled_at)
        const timeStr = dt.toLocaleTimeString("pt-BR", {
          hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
        })
        const addressNote = visit.address ? ` no endereço ${visit.address}` : ""
        const msg = `Oi ${visit.leads!.name}! A visita com ${brokerName} é em 1 hora — às ${timeStr}${addressNote}. Nos vemos logo!`

        const { data: wa } = await supabase
          .from("whatsapp_accounts")
          .select("instance_name, provider")
          .eq("user_id", visit.user_id)
          .single()

        if (!wa?.instance_name) return

        const provider = createWhatsAppProvider((wa.provider ?? "evolution") as "evolution" | "bsp")
        await provider.sendMessage({ to: visit.leads!.phone, text: msg })
        await supabase.from("visits").update({ reminder_1h_sent: true }).eq("id", visit.id)
        await supabase.from("messages").insert({
          conversation_id: await getOrCreateConvId(supabase, visit.user_id, visit.leads!.id),
          lead_id: visit.leads!.id,
          user_id: visit.user_id,
          content: msg,
          type: "text",
          sender: "nara",
          flags: [],
        })
      })
      reminders1h++
    }

    return { reminders24h, reminders1h, followUps }
  }
)

async function getOrCreateConvId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  leadId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .eq("is_active", true)
    .single()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from("conversations")
    .insert({ user_id: userId, lead_id: leadId })
    .select("id")
    .single()

  return created!.id
}
