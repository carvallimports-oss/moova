import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import Anthropic from "@anthropic-ai/sdk"

let _ai: Anthropic | null = null
function getAI() {
  if (!_ai) _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _ai
}

// Cron toda segunda-feira 7h: Cora me Conta — curadoria semanal de mercado
export const sendCoraContaNewsletter = inngest.createFunction(
  {
    id: "send-cora-conta-newsletter",
    retries: 2,
    triggers: [{ cron: "0 7 * * 1" }], // toda segunda às 7h
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const weekStr = now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })

    // Busca assinantes Opera+ com email
    const subscribers = await step.run("fetch-subscribers", async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(`
          user_id,
          users!subscriptions_user_id_fkey(email, broker_name, name, city, state_uf)
        `)
        .in("plan", ["opera", "inteligencia", "maestria"])
        .eq("status", "active")
      return (data ?? []) as unknown as Array<{
        user_id: string
        users: { email: string; broker_name: string | null; name: string; city: string | null; state_uf: string | null } | null
      }>
    })

    if (!subscribers.length) return { sent: 0 }

    // Gera conteúdo da newsletter (único para todos — personalização por cidade no futuro)
    const content = await step.run("generate-newsletter-content", async () => {
      const prompt = `Você é a Cora, assistente de mercado imobiliário da Moova.
Escreva a newsletter semanal "Cora me Conta" para a semana de ${weekStr}.

Gere conteúdo RELEVANTE e ATUAL para corretores de imóveis brasileiros em 2025/2026:

**📊 SELIC E FINANCIAMENTO**
(impacto atual da Selic nos financiamentos imobiliários — use dados realistas de 2025/2026)

**🏗️ MERCADO EM MOVIMENTO**
(1 tendência relevante: MCMV, alto padrão, retrofit, coworking, tendência regional)

**📱 DICA DA SEMANA**
(1 dica prática de produtividade, captação ou atendimento para o corretor)

**📈 NÚMERO DA SEMANA**
(1 estatística relevante do mercado imobiliário brasileiro — cite fonte)

**💡 PARA REFLETIR**
(1 frase ou insight curto sobre vendas/relacionamento — no estilo direto da Cora)

Tom: direto, informado, sem rodeios. Brasileiro. Máximo 400 palavras no total.
NÃO use asteriscos duplicados para bold em HTML — use tags HTML simples.
Escreva em português brasileiro.`

      try {
        const res = await getAI().messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        })
        return (res.content[0] as { type: string; text: string }).text
      } catch {
        return `Olá! Esta é sua curadoria semanal da Cora.\n\nEssa semana, o mercado imobiliário continua aquecido nas grandes capitais. Financiamento Caixa segue com boas condições para imóveis até R$ 1,5M. Fique de olho em oportunidades de imóveis compactos — o perfil comprador está priorizando localização e custo-benefício.\n\nDica da semana: responda os leads em até 5 minutos. A taxa de conversão cai 80% após 30 minutos sem resposta.`
      }
    })

    // Formata HTML da newsletter
    const contentHtml = content
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")

    let sent = 0

    for (const sub of subscribers) {
      if (!sub.users?.email) continue
      const brokerName = sub.users.broker_name ?? sub.users.name ?? "Corretor"

      await step.run(`send-newsletter-${sub.user_id}`, async () => {
        await sendEmail({
          to: sub.users!.email,
          subject: `Cora me Conta — semana de ${weekStr}`,
          html: `
            <div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;color:#2A2A2A">
              <div style="padding:24px 0;border-bottom:2px solid #E0D8CE">
                <span style="font-size:12px;color:#8A8A8A;text-transform:uppercase;letter-spacing:2px">Moova</span>
                <h1 style="font-size:22px;color:#2D4A3E;margin:8px 0 0">Cora me Conta</h1>
                <p style="font-size:13px;color:#8A8A8A;margin:4px 0 0">Semana de ${weekStr}</p>
              </div>

              <div style="padding:24px 0">
                <p style="color:#5A5A5A;font-size:14px">Oi, ${brokerName}! Aqui é a Cora com sua curadoria da semana.</p>
                <div style="font-size:14px;color:#2A2A2A;line-height:1.7">
                  <p>${contentHtml}</p>
                </div>
              </div>

              <div style="border-top:1px solid #E0D8CE;padding:20px 0;font-size:11px;color:#8A8A8A">
                <p>Esta newsletter é gerada pela Cora, assistente IA da Moova.<br>
                Você recebe porque é assinante Moova Opera ou superior.</p>
                <p>Moova · <a href="https://moovaimob.com" style="color:#B87333">moovaimob.com</a></p>
              </div>
            </div>
          `,
        })
      })
      sent++
    }

    return { sent, total: subscribers.length }
  }
)
