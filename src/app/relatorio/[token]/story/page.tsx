import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export default async function StoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: diag } = await supabase
    .from("diagnostico_nara_14d")
    .select("*, users(broker_name)")
    .eq("share_token", token)
    .single()

  if (!diag) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brokerName = (diag.users as any)?.broker_name ?? "Corretor"
  const leadsContacted = diag.leads_contacted ?? diag.leads_attended ?? 0
  const visitsScheduled = diag.visits_scheduled ?? 0
  const estimatedCommission = diag.estimated_commission ?? 0
  const started = new Date(diag.started_at)
  const ends = new Date(diag.ends_at)

  return (
    <div className="min-h-screen bg-[#1A2D25] flex flex-col items-center justify-start py-6 px-4">
      {/* Hint banner — hidden on print/screenshot */}
      <div className="print:hidden mb-4 bg-white/10 rounded-full px-4 py-2 text-white text-xs text-center">
        Tire um print desta tela para compartilhar nos Stories
      </div>

      {/* Story card — 9:16 ratio */}
      <div
        className="w-full max-w-[390px] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(160deg, #1A2D25 0%, #2D4A3E 40%, #1A3028 100%)" }}
      >
        {/* Top bar */}
        <div className="px-8 pt-10 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#B87333] rounded-full" />
            <span className="font-serif text-white text-xl tracking-tight">Moova</span>
          </div>
          <span className="text-xs text-[#8AC0A8] font-mono uppercase tracking-widest">IA Imobiliária</span>
        </div>

        {/* Broker + period */}
        <div className="px-8 pb-8">
          <p className="text-[#B87333] text-xs uppercase tracking-widest font-mono">Diagnóstico Nara · 14 dias</p>
          <h1 className="font-serif text-white text-2xl mt-1 leading-tight">{brokerName}</h1>
          <p className="text-[#6AA88A] text-xs mt-1">
            {started.toLocaleDateString("pt-BR")} – {ends.toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Commission hero */}
        <div className="mx-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 px-6 py-8 text-center">
          <p className="text-[#8AC0A8] text-xs uppercase tracking-widest mb-3">Comissão estimada</p>
          <p className="font-serif text-white leading-none" style={{ fontSize: "clamp(2.5rem, 12vw, 3.5rem)", fontWeight: 700 }}>
            {fmt(estimatedCommission)}
          </p>
          <p className="text-[#6AA88A] text-[11px] mt-3">6% sobre leads QUENTE em 14 dias</p>
        </div>

        {/* Stats row */}
        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5 text-center">
            <p className="text-4xl font-bold text-white">{leadsContacted}</p>
            <p className="text-xs text-[#8AC0A8] mt-1">leads contatados</p>
          </div>
          <div className="rounded-xl bg-[#B87333]/20 border border-[#B87333]/30 p-5 text-center">
            <p className="text-4xl font-bold text-[#D4924A]">{visitsScheduled}</p>
            <p className="text-xs text-[#C0885A] mt-1">visitas agendadas</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="px-8 py-10 text-center space-y-1">
          <p className="text-white/40 text-[11px] uppercase tracking-widest">Powered by</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-0.5 h-4 bg-[#B87333] rounded-full" />
            <span className="font-serif text-white text-lg">Moova</span>
          </div>
          <p className="text-white/30 text-[10px]">moova.com.br</p>
        </div>
      </div>

      {/* Back link */}
      <Link
        href={`/relatorio/${token}`}
        className="print:hidden mt-6 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        ← Ver relatório completo
      </Link>
    </div>
  )
}
