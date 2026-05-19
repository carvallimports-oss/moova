import { inngest } from "../client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"

// Cron diário 8h: suspende assinaturas inadimplentes há mais de 5 dias
export const suspendOverdue = inngest.createFunction(
  {
    id: "suspend-overdue",
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient()
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000)

    const overdue = await step.run("fetch-overdue", async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(`
          id, user_id, overdue_since,
          users!subscriptions_user_id_fkey(email, broker_name, name)
        `)
        .eq("status", "past_due")
        .lte("overdue_since", fiveDaysAgo.toISOString())
      return (data ?? []) as unknown as Array<{
        id: string
        user_id: string
        overdue_since: string
        users: { email: string; broker_name: string | null; name: string } | null
      }>
    })

    if (!overdue.length) return { suspended: 0 }

    let suspended = 0

    for (const sub of overdue) {
      await step.run(`suspend-${sub.id}`, async () => {
        await supabase
          .from("subscriptions")
          .update({ status: "suspended" })
          .eq("id", sub.id)

        const brokerName = sub.users?.broker_name ?? sub.users?.name ?? "Corretor"
        const email = sub.users?.email

        if (email) {
          await sendEmail({
            to: email,
            subject: "Acesso Moova suspenso — pagamento pendente",
            html: `
              <p>Olá, ${brokerName}.</p>
              <p>Identificamos que o pagamento da sua assinatura Moova está pendente há mais de 5 dias.</p>
              <p>Por isso, seu acesso foi temporariamente suspenso até a regularização.</p>
              <p>Para reativar, acesse seu painel Asaas ou entre em contato com nosso suporte.</p>
              <p style="color:#8A8A8A;font-size:12px">Esta comunicação é da Moova, não da Nara.</p>
            `,
          })
        }
      })
      suspended++
    }

    return { suspended }
  }
)
