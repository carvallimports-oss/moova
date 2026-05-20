import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, XCircle, CreditCard, Users } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  trial:     { label: "Trial ativo",     icon: CheckCircle2, color: "text-blue-700",  bg: "bg-blue-50 border-blue-200" },
  active:    { label: "Assinatura ativa", icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50 border-green-200" },
  past_due:  { label: "Pagamento atrasado", icon: AlertCircle, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  suspended: { label: "Suspensa",         icon: XCircle,      color: "text-red-700",   bg: "bg-red-50 border-red-200" },
  canceled:  { label: "Cancelada",        icon: XCircle,      color: "text-gray-600",  bg: "bg-gray-50 border-gray-200" },
}

const PLANS = [
  { id: "starter", label: "Moova Starter", price: "R$ 799/mês", provider: "Evolution API", highlight: false },
  { id: "pro",     label: "Moova Pro",     price: "R$ 1.199/mês", provider: "BSP Oficial", highlight: true },
]

export default async function CobrancaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const status = sub?.status ?? "trial"
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.trial
  const StatusIcon = statusInfo.icon
  const currentPeriodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
    : null
  const trialEnd = sub?.trial_ends_at
    ? new Date(sub.trial_ends_at).toLocaleDateString("pt-BR")
    : null

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Cobrança</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Gerencie sua assinatura</p>
      </div>

      {/* Status atual */}
      <Card className={`border ${statusInfo.bg}`}>
        <CardContent className="p-5 flex items-center gap-4">
          <StatusIcon className={`w-6 h-6 shrink-0 ${statusInfo.color}`} />
          <div className="flex-1">
            <p className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
            {status === "active" && currentPeriodEnd && (
              <p className="text-sm text-[#4A4A3A] mt-0.5">Próxima cobrança: {currentPeriodEnd}</p>
            )}
            {status === "trial" && trialEnd && (
              <p className="text-sm text-[#4A4A3A] mt-0.5">Trial encerra em: {trialEnd}</p>
            )}
            {status === "past_due" && (
              <p className="text-sm text-orange-600 mt-0.5">Regularize o pagamento para evitar suspensão.</p>
            )}
          </div>
          {sub?.plan && (
            <Badge className="bg-[#30360E]/10 text-[#30360E] border-0 capitalize">{sub.plan}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Planos */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg text-[#30360E]">Planos</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.id
            return (
              <Card key={plan.id} className={`border relative ${plan.highlight ? "border-[#787F56]" : "border-[#D4C5A0]"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#787F56] text-white text-[10px] px-3 py-0.5 rounded-full">Mais popular</span>
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div>
                    <p className="font-medium text-[#2A2A2A]">{plan.label}</p>
                    <p className="text-[#787F56] font-bold text-xl mt-1">{plan.price}</p>
                  </div>
                  <div className="space-y-1.5 text-sm text-[#4A4A3A]">
                    <p>✓ Nara ativa 24/7</p>
                    <p>✓ Diagnóstico 14 dias</p>
                    <p>✓ Pacto Moova 90</p>
                    <p>✓ {plan.provider}</p>
                  </div>
                  {isCurrent ? (
                    <div className="w-full text-center text-sm text-[#30360E] font-medium py-2 bg-[#EEF0E8] rounded-lg">
                      Plano atual
                    </div>
                  ) : (
                    <a
                      href="mailto:contato@moova.com.br?subject=Quero mudar de plano"
                      className="block w-full text-center text-sm text-white bg-[#30360E] hover:bg-[#4A5218] py-2 rounded-lg transition-colors"
                    >
                      Solicitar mudança
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Histórico placeholder */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg text-[#30360E]">Histórico de pagamentos</h2>
        {sub?.asaas_customer_id ? (
          <Card className="border-[#D4C5A0]">
            <CardContent className="p-5 flex items-center gap-3 text-[#4A4A3A]">
              <CreditCard className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm">Pagamentos processados via Asaas.</p>
                <p className="text-xs text-[#7A7A6A] mt-0.5">
                  ID do cliente: <code className="bg-[#E2D4B9] px-1 rounded">{sub.asaas_customer_id}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-[#7A7A6A]">Nenhum pagamento registrado ainda.</p>
        )}
      </div>

      {/* Círculo Moova */}
      {(status === "active" || status === "trial") && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#30360E]">Círculo Moova</h2>
          <Card className="border-[#30360E]/20 bg-[#30360E]">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#787F56]" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-white">Comunidade exclusiva de corretores Moova</p>
                <p className="text-sm text-[#B0D0C0] leading-relaxed">
                  O link de acesso ao Círculo Moova (Discord) é enviado por email após a confirmação do seu primeiro pagamento.
                  A comunidade começa na semana 20 do programa.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Case da semana", "Cora me ajudou", "Pedido de feature", "Selo Fundador"].map((tag) => (
                    <span key={tag} className="bg-white/10 text-[#B0D0C0] px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancelamento */}
      {status === "active" && (
        <div className="border border-[#D4C5A0] rounded-xl p-5 space-y-2">
          <p className="text-sm font-medium text-[#2A2A2A]">Cancelar assinatura</p>
          <p className="text-xs text-[#7A7A6A]">
            Para cancelar, entre em contato: <strong>suporte@moova.com.br</strong>.
            Lembre-se de verificar as condições do Pacto Moova 90 antes de cancelar.
          </p>
        </div>
      )}
    </div>
  )
}
