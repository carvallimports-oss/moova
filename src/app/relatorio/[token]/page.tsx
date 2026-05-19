import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export default async function PublicRelatorioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: diag } = await supabase
    .from("diagnostico_nara_14d")
    .select("*, users(broker_name)")
    .eq("share_token", token)
    .single()

  if (!diag) notFound()

  const brokerName = (diag.users as any)?.broker_name ?? "Corretor"
  const leadsContacted = diag.leads_contacted ?? diag.leads_attended ?? 0
  const visitsScheduled = diag.visits_scheduled ?? 0
  const estimatedCommission = diag.estimated_commission ?? 0
  const started = new Date(diag.started_at)
  const ends = new Date(diag.ends_at)

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
          <p className="text-xs text-[#B87333] uppercase tracking-widest font-mono">Diagnóstico Nara · 14 dias</p>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">{brokerName}</h1>
          <p className="text-[#8A8A8A] text-xs">
            {started.toLocaleDateString("pt-BR")} – {ends.toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#2D4A3E] rounded-2xl p-5 text-white text-center">
            <p className="text-4xl font-bold">{leadsContacted}</p>
            <p className="text-xs text-[#B0D0C0] mt-1">leads contatados</p>
          </div>
          <div className="bg-[#F5F0E8] rounded-2xl p-5 text-center">
            <p className="text-4xl font-bold text-[#B87333]">{visitsScheduled}</p>
            <p className="text-xs text-[#8A8A8A] mt-1">visitas agendadas</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2D4A3E] to-[#3A6B5A] rounded-2xl p-7 text-center text-white">
          <p className="text-xs text-[#8AC0A8] uppercase tracking-widest mb-1">Comissão estimada</p>
          <p className="text-5xl font-serif font-bold">{fmt(estimatedCommission)}</p>
          <p className="text-[10px] text-[#70A898] mt-2">6% sobre leads QUENTE</p>
        </div>

        {/* Stories CTA */}
        <div className="border border-[#E0D8CE] rounded-2xl p-5 text-center space-y-3 bg-[#FAF7F2]">
          <p className="text-xs text-[#5A5A5A]">Compartilhe nos Stories do Instagram</p>
          <a
            href={`/relatorio/${token}/story`}
            className="inline-block bg-[#2D4A3E] text-white text-sm px-5 py-2.5 rounded-lg hover:bg-[#3A6B5A] transition-colors"
          >
            Ver versão Stories 9:16
          </a>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-[#8A8A8A]">Powered by</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1 h-4 bg-[#B87333] rounded-full" />
            <span className="font-serif text-[#2D4A3E] text-lg">Moova</span>
          </div>
          <p className="text-[10px] text-[#B0A898]">moova.com.br</p>
        </div>
      </div>
    </div>
  )
}
