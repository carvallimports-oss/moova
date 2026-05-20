import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LocacaoClient } from "@/components/dashboard/locacao-client"

export const dynamic = "force-dynamic"

export default async function LocacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: contracts } = await supabase
    .from("rental_contracts")
    .select("id, tenant_name, tenant_phone, tenant_email, address, rent_value, admin_fee_pct, start_date, end_date, status, guarantee_type, payment_day, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const totalRent = (contracts ?? []).filter(c => c.status === "vigente").reduce((sum, c) => sum + c.rent_value, 0)
  const activeCount = (contracts ?? []).filter(c => c.status === "vigente").length
  const inadimplentesCount = (contracts ?? []).filter(c => c.status === "inadimplente").length

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Gestão de Locação</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Contratos, cobranças e repasses — {contracts?.length ?? 0} contratos</p>
      </div>

      {/* Summary cards */}
      {(contracts?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#30360E] rounded-xl p-4">
            <p className="text-[10px] text-[#B0C080] uppercase tracking-widest">Carteira ativa</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalRent.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-[#B0C080] mt-0.5">em {activeCount} contratos vigentes</p>
          </div>
          <div className="bg-[#EEF0E8] rounded-xl p-4">
            <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Receita mensal</p>
            <p className="text-2xl font-bold text-[#30360E] mt-1">
              {(totalRent * 0.10).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-[#7A7A6A] mt-0.5">taxa de administração (10%)</p>
          </div>
          {inadimplentesCount > 0 && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-[10px] text-red-500 uppercase tracking-widest">Inadimplentes</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{inadimplentesCount}</p>
              <p className="text-xs text-red-500 mt-0.5">contratos em atraso</p>
            </div>
          )}
        </div>
      )}

      <LocacaoClient initialContracts={contracts ?? []} />
    </div>
  )
}
