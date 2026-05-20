import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RelatorioShareButton } from "@/components/dashboard/relatorio-share-button"
import { TrendingUp, Users, Calendar, CheckCircle } from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function pct(num: number, den: number) {
  if (den === 0) return "—"
  return `${Math.round((num / den) * 100)}%`
}

export default async function RelatorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: diag }, { data: profile }, { data: leadsByStatus }] = await Promise.all([
    supabase
      .from("diagnostico_nara_14d")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("users")
      .select("broker_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("leads")
      .select("status")
      .eq("user_id", user.id),
  ])

  const brokerName = profile?.broker_name ?? "Corretor"
  const leadsContacted = diag?.leads_contacted ?? diag?.leads_attended ?? 0
  const visitsScheduled = diag?.visits_scheduled ?? 0
  const estimatedCommission = diag?.estimated_commission ?? 0
  const started = diag?.started_at ? new Date(diag.started_at) : new Date()
  const ends = diag?.ends_at ? new Date(diag.ends_at) : new Date()
  const now = new Date()
  const daysElapsed = Math.min(14, Math.floor((now.getTime() - started.getTime()) / 86400000))
  const isCompleted = diag?.completed_at != null || (diag?.ends_at != null && new Date(diag.ends_at) < now)

  // Funil de conversão
  const statuses = (leadsByStatus ?? []).map((l) => l.status)
  const totalLeads = statuses.length
  const qualificados = statuses.filter((s) =>
    ["qualificado", "em_consideracao", "visita_agendada", "visitou", "em_negociacao", "fechou"].includes(s)
  ).length
  const visitasOcorridas = statuses.filter((s) =>
    ["visita_agendada", "visitou", "em_negociacao", "fechou"].includes(s)
  ).length
  const fechamentos = statuses.filter((s) => s === "fechou").length

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-xs text-[#787F56] uppercase tracking-widest font-mono">Diagnóstico Nara · 14 dias</p>
        <h1 className="font-serif text-3xl text-[#30360E]">{brokerName}, aqui está o resultado</h1>
        <p className="text-[#7A7A6A] text-sm">
          {isCompleted
            ? `Período encerrado em ${ends.toLocaleDateString("pt-BR")}`
            : `Dia ${daysElapsed} de 14 — em andamento`}
        </p>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#30360E] rounded-2xl p-6 text-white text-center">
          <p className="text-5xl font-bold">{leadsContacted}</p>
          <p className="text-sm text-[#B0D0C0] mt-2">leads contatados</p>
        </div>
        <div className="bg-[#EDE5CD] rounded-2xl p-6 text-center">
          <p className="text-5xl font-bold text-[#787F56]">{visitsScheduled}</p>
          <p className="text-sm text-[#7A7A6A] mt-2">visitas agendadas</p>
        </div>
      </div>

      {/* Commission highlight */}
      <div className="bg-gradient-to-br from-[#30360E] to-[#4A5218] rounded-2xl p-8 text-center text-white">
        <p className="text-sm text-[#B0D0C0] uppercase tracking-widest mb-2">Comissão estimada</p>
        <p className="text-6xl font-serif font-bold">{fmt(estimatedCommission)}</p>
        <p className="text-xs text-[#8AC0A8] mt-3">Baseado em leads QUENTE × 6% de comissão média</p>
      </div>

      {/* Funil de conversão (M09) */}
      <div className="border border-[#D4C5A0] rounded-2xl p-6 space-y-4 bg-white">
        <h2 className="font-serif text-lg text-[#30360E]">Funil de conversão</h2>
        <div className="space-y-3">
          {[
            {
              icon: Users,
              label: "Total de leads",
              value: totalLeads,
              rate: null,
              color: "text-[#30360E]",
            },
            {
              icon: TrendingUp,
              label: "Leads qualificados",
              value: qualificados,
              rate: pct(qualificados, totalLeads),
              color: "text-[#4A5218]",
            },
            {
              icon: Calendar,
              label: "Com visita realizada",
              value: visitasOcorridas,
              rate: pct(visitasOcorridas, qualificados),
              color: "text-[#787F56]",
            },
            {
              icon: CheckCircle,
              label: "Fechamentos",
              value: fechamentos,
              rate: pct(fechamentos, visitasOcorridas),
              color: "text-green-700",
            },
          ].map(({ icon: Icon, label, value, rate, color }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-8 rounded-lg bg-[#30360E]/10 flex items-center justify-center shrink-0"
                style={{ width: `${Math.max(10, Math.round((value / Math.max(totalLeads, 1)) * 100))}%`, minWidth: "40px" }}
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-sm text-[#4A4A3A] truncate">{label}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-sm font-medium ${color}`}>{value}</span>
                  {rate && <span className="text-xs text-[#7A7A6A] bg-[#E2D4B9] px-1.5 py-0.5 rounded">{rate}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[#7A7A6A]">
            <span>Dia 1</span>
            <span>Dia {daysElapsed} de 14</span>
            <span>Dia 14</span>
          </div>
          <div className="h-2 bg-[#D4C5A0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#787F56] rounded-full transition-all"
              style={{ width: `${(daysElapsed / 14) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Marcos narrative */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg text-[#30360E]">Marcos do diagnóstico</h2>
        {[3, 7, 11, 14].map((day) => {
          const reached = daysElapsed >= day
          return (
            <div key={day} className={`flex items-start gap-4 p-4 rounded-xl border ${reached ? "border-[#30360E] bg-[#EEF0E8]" : "border-[#D4C5A0] bg-white opacity-50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${reached ? "bg-[#30360E] text-white" : "bg-[#D4C5A0] text-[#7A7A6A]"}`}>
                {day}
              </div>
              <div>
                <p className="font-medium text-[#30360E] text-sm">
                  {day === 3 && "Primeiros resultados"}
                  {day === 7 && "Meio do caminho"}
                  {day === 11 && "Reta final"}
                  {day === 14 && "Veredito"}
                </p>
                <p className="text-xs text-[#7A7A6A] mt-0.5">
                  {day === 3 && "Nara já entrou em contato com todos os leads e identificou os mais quentes."}
                  {day === 7 && "Leads qualificados estão sendo trabalhados. Visitas começando a acontecer."}
                  {day === 11 && "Negociações em andamento. Momento de você assumir os mais avançados."}
                  {day === 14 && "Diagnóstico completo. Hora de decidir: continuar com o Moova ou acionar o Pacto."}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Compartilhar */}
      <div className="border border-[#D4C5A0] rounded-2xl p-6 text-center space-y-3 bg-[#F5F0E0]">
        <p className="text-sm text-[#4A4A3A]">Compartilhe o resultado com seu gestor ou investidor</p>
        <RelatorioShareButton />
      </div>

      {/* CTA */}
      {isCompleted && (
        <div className="border border-[#D4C5A0] rounded-2xl p-6 text-center space-y-4 bg-[#F5F0E0]">
          <p className="font-serif text-lg text-[#30360E]">Diagnóstico concluído</p>
          <p className="text-sm text-[#4A4A3A]">
            Se os resultados ficaram abaixo do esperado, você pode acionar o Pacto Moova 90.
          </p>
          <Link
            href="/dashboard/pacto"
            className={cn(buttonVariants({ variant: "outline" }), "border-[#30360E] text-[#30360E]")}
          >
            Ver Pacto Moova 90
          </Link>
        </div>
      )}
    </div>
  )
}
