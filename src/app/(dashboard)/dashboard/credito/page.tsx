import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreditoClient } from "@/components/dashboard/credito-client"

export const dynamic = "force-dynamic"

export default async function CreditoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: analyses } = await supabase
    .from("credit_analyses")
    .select("id, subject_name, subject_cpf, subject_type, monthly_income, rent_requested, income_ratio, score, verdict, risk_level, ai_summary, ai_flags, consulted_at, valid_until")
    .eq("user_id", user.id)
    .order("consulted_at", { ascending: false })

  const approved = (analyses ?? []).filter(a => a.verdict === "aprovado").length
  const rejected = (analyses ?? []).filter(a => a.verdict === "reprovado").length
  const avgScore = analyses?.length
    ? Math.round((analyses ?? []).filter(a => a.score).reduce((s, a) => s + (a.score ?? 0), 0) / (analyses?.filter(a => a.score).length || 1))
    : null

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Análise de Crédito</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Consulta de crédito para inquilinos, fiadores e compradores</p>
      </div>

      {(analyses?.length ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#EEF0E8] rounded-xl p-4">
            <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Total</p>
            <p className="text-2xl font-bold text-[#30360E] mt-1">{analyses?.length ?? 0}</p>
            <p className="text-xs text-[#7A7A6A] mt-0.5">análises realizadas</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-[10px] text-green-600 uppercase tracking-widest">Aprovados</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{approved}</p>
            <p className="text-xs text-green-600 mt-0.5">perfis aprovados</p>
          </div>
          <div className="bg-[#F5F0E0] rounded-xl p-4">
            <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Score médio</p>
            <p className="text-2xl font-bold text-[#30360E] mt-1">{avgScore ?? "—"}</p>
            <p className="text-xs text-[#7A7A6A] mt-0.5">pontos (0-1000)</p>
          </div>
        </div>
      )}

      <div className="bg-[#F5F0E0] rounded-xl p-4 text-sm text-[#4A4A3A] leading-relaxed">
        <strong className="text-[#30360E]">Como funciona:</strong> Informe CPF e renda do{" "}
        interessado. A Cora calcula a capacidade de pagamento (comprometimento de renda), consulta{" "}
        o score de crédito e gera um parecer detalhado com recomendações de garantia.
      </div>

      <CreditoClient initialAnalyses={analyses ?? []} />
    </div>
  )
}
