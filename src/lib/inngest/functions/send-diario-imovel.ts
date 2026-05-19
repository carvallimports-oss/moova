import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"
import Anthropic from "@anthropic-ai/sdk"

let _anthropic: Anthropic | null = null
function getAI() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// Cron toda segunda 8h: envia Diário do Imóvel para proprietários com optin
export const sendDiarioImovel = inngest.createFunction(
  {
    id: "send-diario-imovel",
    retries: 2,
    triggers: [{ cron: "0 8 * * 1" }], // toda segunda-feira às 8h
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

    // Busca proprietários com diario_optin = true e dados de contato
    const optedIn = await step.run("fetch-opted-in-landlords", async () => {
      const { data } = await supabase
        .from("landlord_profiles")
        .select(`
          id, name, phone, email, user_id, diario_contact, property_id,
          users!landlord_profiles_user_id_fkey(broker_name, name, phone, nara_formality, nara_custom_prompt)
        `)
        .eq("diario_optin", true)
        .not("status", "in", "(vendido,retomado)")
      return (data ?? []) as unknown as Array<{
        id: string
        name: string
        phone: string | null
        email: string | null
        user_id: string
        diario_contact: "whatsapp" | "email" | null
        property_id: string | null
        users: { broker_name: string | null; name: string; phone: string; nara_formality: string | null; nara_custom_prompt: string | null } | null
      }>
    })

    if (!optedIn.length) return { sent: 0 }

    let sent = 0

    for (const landlord of optedIn) {
      await step.run(`diario-${landlord.id}`, async () => {
        if (!landlord.phone && !landlord.email) return

        const broker = landlord.users
        const brokerName = broker?.broker_name ?? broker?.name ?? "o corretor"

        // Busca métricas da semana passada para o imóvel
        let weeklyLeads = 0
        let weeklyVisits = 0

        if (landlord.property_id) {
          const { count: leadsCount } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", landlord.user_id)
            .gte("created_at", oneWeekAgo.toISOString())

          const { count: visitsCount } = await supabase
            .from("visits")
            .select("id", { count: "exact", head: true })
            .eq("user_id", landlord.user_id)
            .eq("property_id", landlord.property_id)
            .gte("scheduled_at", oneWeekAgo.toISOString())

          weeklyLeads = leadsCount ?? 0
          weeklyVisits = visitsCount ?? 0
        }

        // Gera texto do diário via IA
        const formality = broker?.nara_formality ?? "informal"
        const prompt = `Você é a Cora, assistente IA do corretor ${brokerName}.
Escreva um Diário do Imóvel para o proprietário ${landlord.name}.

Dados da semana:
- Leads recebidos: ${weeklyLeads}
- Visitas realizadas: ${weeklyVisits}
- Data: ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}

Tom: ${formality === "formal" ? "formal e profissional" : "informal, próximo e caloroso"}

Escreva uma mensagem curta (5-8 linhas) com:
1. Saudação ao proprietário pelo nome
2. Resumo semanal (leads + visitas)
3. Próxima ação planejada
4. Encerramento assinado por você (Cora, assistente de ${brokerName})

Seja objetiva. Não invente dados além dos fornecidos. Escreva em português brasileiro.`

        let message: string
        try {
          const res = await getAI().messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
          })
          message = (res.content[0] as { type: string; text: string }).text
        } catch {
          message = `Olá, ${landlord.name}! 👋\n\nEsta é sua atualização semanal de ${brokerName}.\n\nEssa semana: ${weeklyLeads} contatos recebidos e ${weeklyVisits} visitas realizadas.\n\nQualquer dúvida, estou à disposição!\n\n— Cora, assistente de ${brokerName}`
        }

        // Envia por WhatsApp se configurado
        if (landlord.diario_contact === "whatsapp" && landlord.phone && broker?.phone) {
          try {
            const { data: waAccount } = await supabase
              .from("whatsapp_accounts")
              .select("instance_name, provider")
              .eq("user_id", landlord.user_id)
              .single()

            if (waAccount?.instance_name) {
              const provider = createWhatsAppProvider((waAccount.provider ?? "evolution") as "evolution" | "bsp")
              await provider.sendMessage({ to: landlord.phone, text: message })
            }
          } catch {
            // falha silenciosa — log abaixo
          }
        }

        // Registra o envio
        await supabase.from("diario_imovel_logs").insert({
          user_id: landlord.user_id,
          landlord_id: landlord.id,
          property_id: landlord.property_id,
          sent_at: now.toISOString(),
          content_summary: {
            weekly_leads: weeklyLeads,
            weekly_visits: weeklyVisits,
            channel: landlord.diario_contact ?? "whatsapp",
          },
        })
      })
      sent++
    }

    return { sent }
  }
)
