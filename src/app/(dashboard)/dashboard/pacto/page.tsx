import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react"
import { FechamentosForm } from "@/components/dashboard/fechamentos-form"

export const dynamic = "force-dynamic"

const SCENARIOS = {
  A: {
    label: "Cenário A — Meta atingida",
    desc: "Você atingiu R$ 50k em comissão real. Contrato segue sem devolução.",
    refund: "0%",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  B: {
    label: "Cenário B — Jogou limpo",
    desc: "Não atingiu a meta, mas cumpriu os compromissos: visitas, aprovações e leads quentes aceitos. Devolução de 70% em até 30 dias úteis.",
    refund: "70% devolvido",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  C: {
    label: "Cenário C — Participação parcial",
    desc: "Boa-fé entre 50% e 79%. Devolução de 35% + 1 mês grátis para continuar.",
    refund: "35% devolvido + 1 mês grátis",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  D: {
    label: "Cenário D — Garantia anulada",
    desc: "Boa-fé abaixo de 50% ou sabotagem identificada. A garantia não se aplica.",
    refund: "sem devolução",
    color: "text-red-700 bg-red-50 border-red-200",
  },
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export default async function PactoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: pacto }, { data: transactions }, { data: closedLeads }] = await Promise.all([
    supabase
      .from("pacto_moova_90_audit")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("transactions")
      .select("id, description, commission, closed_at, leads(id, name)")
      .eq("user_id", user.id)
      .order("closed_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("status", "em_negociacao")
      .order("name", { ascending: true }),
  ])

  const started = pacto?.started_at ? new Date(pacto.started_at) : null
  const ends = pacto?.ends_at ? new Date(pacto.ends_at) : null
  const now = new Date()
  const daysElapsed = started
    ? Math.min(90, Math.floor((now.getTime() - started.getTime()) / 86400000))
    : 0
  const daysLeft = ends ? Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86400000)) : 0
  const isResolved = !!pacto?.resolved_at
  const scenario = pacto?.scenario as keyof typeof SCENARIOS | null

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/relatorio" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-[#5A5A5A] gap-1.5")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Diagnóstico
        </Link>
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-[#B87333] uppercase tracking-widest font-mono">Pacto Moova 90</p>
        <h1 className="font-serif text-3xl text-[#2D4A3E]">Garantia reversa real</h1>
        <p className="text-sm text-[#8A8A8A]">
          Se a Nara não entregar e você fez sua parte, devolvemos até 70% do valor investido.
        </p>
      </div>

      {!pacto ? (
        <div className="border border-[#E0D8CE] rounded-2xl p-8 text-center space-y-4 bg-white">
          <Clock className="w-10 h-10 text-[#B87333] mx-auto opacity-60" />
          <p className="font-medium text-[#2D4A3E]">Pacto ainda não ativado</p>
          <p className="text-sm text-[#5A5A5A] leading-relaxed max-w-sm mx-auto">
            O Pacto Moova 90 é ativado automaticamente ao final do Diagnóstico 14 dias,
            quando você confirma a assinatura dos 3 meses.
          </p>
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="bg-[#2D4A3E] rounded-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#B0D0C0] uppercase tracking-widest">Status</p>
                <p className="text-xl font-serif mt-1">
                  {isResolved ? "Encerrado" : `Dia ${daysElapsed} de 90`}
                </p>
              </div>
              {isResolved
                ? <CheckCircle2 className="w-8 h-8 text-[#B0D0C0]" />
                : <AlertCircle className="w-8 h-8 text-[#B87333]" />
              }
            </div>
            {!isResolved && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#8AC0A8]">
                  <span>Início: {started?.toLocaleDateString("pt-BR")}</span>
                  <span>{daysLeft} dias restantes</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B87333] rounded-full transition-all"
                    style={{ width: `${(daysElapsed / 90) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#E0D8CE] rounded-xl p-5 bg-white text-center space-y-1">
              <p className="text-2xl font-bold text-[#2D4A3E]">
                {fmt(pacto.commission_achieved ?? 0)}
              </p>
              <p className="text-xs text-[#8A8A8A]">comissão realizada</p>
            </div>
            <div className="border border-[#E0D8CE] rounded-xl p-5 bg-white text-center space-y-1">
              <p className="text-2xl font-bold text-[#B87333]">
                {((pacto.good_faith_score ?? 0) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-[#8A8A8A]">score de boa-fé</p>
            </div>
          </div>

          {/* Cenário atual */}
          {scenario && (
            <div className={cn("border rounded-xl p-5 space-y-2", SCENARIOS[scenario].color)}>
              <p className="font-medium text-sm">{SCENARIOS[scenario].label}</p>
              <p className="text-xs leading-relaxed">{SCENARIOS[scenario].desc}</p>
              <p className="text-xs font-bold">Reembolso potencial: {SCENARIOS[scenario].refund}</p>
            </div>
          )}

          {/* Reembolso aprovado */}
          {isResolved && pacto.refund_amount && pacto.refund_amount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-1">
              <p className="text-xs text-green-700 uppercase tracking-widest font-mono">Reembolso aprovado</p>
              <p className="text-3xl font-bold text-green-700">{fmt(pacto.refund_amount)}</p>
            </div>
          )}
        </>
      )}

      {/* Fechamentos / comissões reais */}
      <div className="border border-[#E0D8CE] rounded-2xl p-6 space-y-4 bg-white">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Registrar fechamento</h2>
        <p className="text-sm text-[#5A5A5A]">
          Registre cada venda concluída para que o sistema atualize automaticamente sua comissão acumulada no Pacto.
        </p>
        <FechamentosForm
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialTransactions={(transactions ?? []) as any}
          availableLeads={(closedLeads ?? []) as { id: string; name: string }[]}
        />
      </div>

      {/* Regras */}
      <div className="border border-[#E0D8CE] rounded-2xl p-6 space-y-4 bg-white">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Como funciona o Pacto</h2>
        <div className="space-y-3 text-sm text-[#5A5A5A]">
          {[
            "Meta: R$ 50.000 em comissão real nos primeiros 90 dias",
            "Score de boa-fé: % visitas realizadas, escalações atendidas em 4h, leads quentes aceitos",
            "Cenário B (boa-fé ≥80%): 70% devolvido em até 30 dias úteis",
            "Cenário C (boa-fé 50–79%): 35% devolvido + 1 mês grátis",
            "Cenário D (boa-fé <50% ou sabotagem): garantia anulada",
            "Prazo de contestação: 7 dias após veredito, com evidências",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B87333] shrink-0 mt-0.5" />
              <p>{rule}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#8A8A8A]">
          Para acionar o Pacto, entre em contato: <strong>pacto@moova.com.br</strong>
        </p>
      </div>
    </div>
  )
}
