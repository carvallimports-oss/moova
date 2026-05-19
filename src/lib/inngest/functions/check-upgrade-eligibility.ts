import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"
import Anthropic from "@anthropic-ai/sdk"

let _anthropic: Anthropic | null = null
function getAI() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// Cron diário 9h30: verifica elegibilidade de upgrade para Opera
// Sinal: assinatura ativa há 90+ dias + leads engajados + visitas recentes
export const checkUpgradeEligibility = inngest.createFunction(
  {
    id: "check-upgrade-eligibility",
    retries: 2,
    triggers: [{ cron: "30 9 * * *" }], // diário às 9h30
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000)

    // Busca assinantes Atende (evolution/bsp) com 90+ dias sem upgrade recebido
    const candidates = await step.run("fetch-eligible-candidates", async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(`
          id, user_id, plan, created_at,
          users!subscriptions_user_id_fkey(broker_name, name, phone, nara_formality, nara_custom_prompt)
        `)
        .in("plan", ["evolution", "bsp"])
        .eq("status", "active")
        .lte("created_at", ninetyDaysAgo.toISOString())
      return (data ?? []) as unknown as Array<{
        id: string
        user_id: string
        plan: string
        created_at: string
        users: { broker_name: string | null; name: string; phone: string | null; nara_formality: string | null; nara_custom_prompt: string | null } | null
      }>
    })

    if (!candidates.length) return { checked: 0, offered: 0 }

    // Filtra quem já recebeu oferta nos últimos 30 dias
    const alreadyOfferedIds = await step.run("filter-already-offered", async () => {
      const ids = candidates.map((c) => c.user_id)
      const { data } = await supabase
        .from("upgrade_offers")
        .select("user_id")
        .in("user_id", ids)
        .gte("sent_at", thirtyDaysAgo.toISOString())
      return (data ?? []).map((o: { user_id: string }) => o.user_id)
    })

    const alreadyOfferedSet = new Set(alreadyOfferedIds)
    const toCheck = candidates.filter((c) => !alreadyOfferedSet.has(c.user_id))
    if (!toCheck.length) return { checked: candidates.length, offered: 0 }

    let offered = 0

    for (const candidate of toCheck) {
      await step.run(`check-eligibility-${candidate.user_id}`, async () => {
        // Checa volume recente (30 dias)
        const { count: recentLeads } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", candidate.user_id)
          .gte("created_at", thirtyDaysAgo.toISOString())

        const { count: recentVisits } = await supabase
          .from("visits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", candidate.user_id)
          .gte("scheduled_at", thirtyDaysAgo.toISOString())

        // Threshold mínimo: 10 leads OU 3 visitas no mês
        const isEligible = (recentLeads ?? 0) >= 10 || (recentVisits ?? 0) >= 3
        if (!isEligible) return

        const broker = candidate.users
        const brokerName = broker?.broker_name ?? broker?.name ?? "você"
        const formality = broker?.nara_formality ?? "informal"

        // Gera mensagem de upgrade personalizada
        const prompt = `Você é a Cora, assistente IA do corretor ${brokerName}.
Escreva uma mensagem para oferecer o upgrade para Moova Opera (R$ 1.299/mês).

Contexto:
- Corretor está ativo há mais de 90 dias no Moova Atende
- Teve ${recentLeads ?? 0} leads e ${recentVisits ?? 0} visitas no último mês
- Tom: ${formality === "formal" ? "formal e profissional" : "natural e próximo"}

Regras da Cora Constitution:
- Seja honesta e direta, sem pressão
- Explique o benefício real (CRM duplo, portal, estúdio, diário do imóvel)
- Ofereça a decisão ao corretor — nunca force
- Máximo 5-6 linhas
- Em português brasileiro

Exemplo de abertura sugerida: "Pelo que vi aqui esse mês, você tá com volume e ritmo pra ir além do Atende. Quer que eu te mostre o que muda no Opera?"`

        let message: string
        try {
          const res = await getAI().messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }],
          })
          message = (res.content[0] as { type: string; text: string }).text
        } catch {
          message = `Oi, ${brokerName}! 👋\n\nVi que você tá com ótimo ritmo — ${recentLeads ?? 0} leads e ${recentVisits ?? 0} visitas esse mês. Esse volume já justifica o Moova Opera (R$ 1.299/mês): CRM de proprietários, Diário do Imóvel, seu portal profissional e distribuição automática nos portais.\n\nQuer que eu te mostre? Só responder aqui! 🏡\n\n— Cora`
        }

        // Envia via WhatsApp se disponível
        if (broker?.phone) {
          try {
            const { data: waAccount } = await supabase
              .from("whatsapp_accounts")
              .select("instance_name, provider")
              .eq("user_id", candidate.user_id)
              .single()

            if (waAccount?.instance_name) {
              const provider = createWhatsAppProvider((waAccount.provider ?? "evolution") as "evolution" | "bsp")
              await provider.sendMessage({ to: broker.phone, text: message })
            }
          } catch {
            // falha silenciosa
          }
        }

        // Registra oferta enviada
        await supabase.from("upgrade_offers").insert({
          user_id: candidate.user_id,
          from_plan: candidate.plan,
          to_plan: "opera",
          sent_via: "nara",
        })

        // Registra adoção de módulo
        await supabase.from("module_adoption_metrics").upsert(
          { user_id: candidate.user_id, module: "upgrade_offer_opera", last_used_at: now.toISOString() },
          { onConflict: "user_id,module", ignoreDuplicates: false }
        )

        offered++
      })
    }

    return { checked: toCheck.length, offered }
  }
)
