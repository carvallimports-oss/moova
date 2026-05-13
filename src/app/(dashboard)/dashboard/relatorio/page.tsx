import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RelatorioShareButton } from "@/components/dashboard/relatorio-share-button"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export default async function RelatorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: diag }, { data: profile }] = await Promise.all([
    supabase
      .from("diagnostico_cora_14d")
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
  ])

  const brokerName = profile?.broker_name ?? "Corretor"
  const leadsContacted = diag?.leads_contacted ?? diag?.leads_attended ?? 0
  const visitsScheduled = diag?.visits_scheduled ?? 0
  const estimatedCommission = diag?.estimated_commission ?? 0
  const started = diag?.started_at ? new Date(diag.started_at) : new Date()
  const ends = diag?.ends_at ? new Date(diag.ends_at) : new Date()
  const now = new Date()
  const daysElapsed = Math.min(14, Math.floor((now.getTime() - started.getTime()) / 86400000))
  const isCompleted = !!diag?.completed_at

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-xs text-[#B87333] uppercase tracking-widest font-mono">Diagnóstico Cora · 14 dias</p>
        <h1 className="font-serif text-3xl text-[#2D4A3E]">{brokerName}, aqui está o resultado</h1>
        <p className="text-[#8A8A8A] text-sm">
          {isCompleted
            ? `Período encerrado em ${ends.toLocaleDateString("pt-BR")}`
            : `Dia ${daysElapsed} de 14 — em andamento`}
        </p>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#2D4A3E] rounded-2xl p-6 text-white text-center">
          <p className="text-5xl font-bold">{leadsContacted}</p>
          <p className="text-sm text-[#B0D0C0] mt-2">leads contatados</p>
        </div>
        <div className="bg-[#F5F0E8] rounded-2xl p-6 text-center">
          <p className="text-5xl font-bold text-[#B87333]">{visitsScheduled}</p>
          <p className="text-sm text-[#8A8A8A] mt-2">visitas agendadas</p>
        </div>
      </div>

      {/* Commission highlight */}
      <div className="bg-gradient-to-br from-[#2D4A3E] to-[#3A6B5A] rounded-2xl p-8 text-center text-white">
        <p className="text-sm text-[#B0D0C0] uppercase tracking-widest mb-2">Comissão estimada</p>
        <p className="text-6xl font-serif font-bold">{fmt(estimatedCommission)}</p>
        <p className="text-xs text-[#8AC0A8] mt-3">Baseado em leads QUENTE × 6% de comissão média</p>
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[#8A8A8A]">
            <span>Dia 1</span>
            <span>Dia {daysElapsed} de 14</span>
            <span>Dia 14</span>
          </div>
          <div className="h-2 bg-[#E0D8CE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B87333] rounded-full transition-all"
              style={{ width: `${(daysElapsed / 14) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Marcos narrative */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Marcos do diagnóstico</h2>
        {[3, 7, 11, 14].map((day) => {
          const reached = daysElapsed >= day
          return (
            <div key={day} className={`flex items-start gap-4 p-4 rounded-xl border ${reached ? "border-[#2D4A3E] bg-[#F0F5F2]" : "border-[#E0D8CE] bg-white opacity-50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${reached ? "bg-[#2D4A3E] text-white" : "bg-[#E0D8CE] text-[#8A8A8A]"}`}>
                {day}
              </div>
              <div>
                <p className="font-medium text-[#2D4A3E] text-sm">
                  {day === 3 && "Primeiros resultados"}
                  {day === 7 && "Meio do caminho"}
                  {day === 11 && "Reta final"}
                  {day === 14 && "Veredito"}
                </p>
                <p className="text-xs text-[#8A8A8A] mt-0.5">
                  {day === 3 && "Cora já entrou em contato com todos os leads e identificou os mais quentes."}
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
      <div className="border border-[#E0D8CE] rounded-2xl p-6 text-center space-y-3 bg-[#FAF7F2]">
        <p className="text-sm text-[#5A5A5A]">Compartilhe o resultado com seu gestor ou investidor</p>
        <RelatorioShareButton />
      </div>

      {/* CTA */}
      {isCompleted && (
        <div className="border border-[#E0D8CE] rounded-2xl p-6 text-center space-y-4 bg-[#FAF7F2]">
          <p className="font-serif text-lg text-[#2D4A3E]">Diagnóstico concluído</p>
          <p className="text-sm text-[#5A5A5A]">
            Se os resultados ficaram abaixo do esperado, você pode acionar o Pacto Moova 90.
          </p>
          <Link
            href="/dashboard/pacto"
            className={cn(buttonVariants({ variant: "outline" }), "border-[#2D4A3E] text-[#2D4A3E]")}
          >
            Ver Pacto Moova 90
          </Link>
        </div>
      )}
    </div>
  )
}
