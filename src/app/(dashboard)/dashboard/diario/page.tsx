import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DiarioClient } from "@/components/dashboard/diario-client"

export const dynamic = "force-dynamic"

export default async function DiarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: landlords }, { data: logs }] = await Promise.all([
    supabase.from("landlord_profiles")
      .select("id, name, phone, email, diario_optin, diario_contact, status, property_id")
      .eq("user_id", user.id)
      .not("status", "in", "(vendido,retomado)")
      .order("updated_at", { ascending: false }),
    supabase.from("diario_imovel_logs")
      .select("id, landlord_id, sent_at, opened_at, content_summary")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50),
  ])

  const optedIn = (landlords ?? []).filter(l => l.diario_optin).length
  const totalSent = logs?.length ?? 0

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Diário do Imóvel</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Relatório semanal automático para proprietários — {optedIn} proprietários cadastrados</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-[#30360E] rounded-xl p-4">
          <p className="text-[10px] text-[#B0C080] uppercase tracking-widest">Com opt-in</p>
          <p className="text-2xl font-bold text-white mt-1">{optedIn}</p>
          <p className="text-xs text-[#B0C080] mt-0.5">proprietários ativos</p>
        </div>
        <div className="bg-[#EEF0E8] rounded-xl p-4">
          <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Enviados</p>
          <p className="text-2xl font-bold text-[#30360E] mt-1">{totalSent}</p>
          <p className="text-xs text-[#7A7A6A] mt-0.5">diários no total</p>
        </div>
        <div className="bg-[#F5F0E0] rounded-xl p-4">
          <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Cadência</p>
          <p className="text-lg font-bold text-[#30360E] mt-1">Segunda-feira</p>
          <p className="text-xs text-[#7A7A6A] mt-0.5">às 8h automaticamente</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#F5F0E0] rounded-xl p-5 space-y-3">
        <p className="font-medium text-[#30360E]">Como o Diário do Imóvel funciona</p>
        <ol className="space-y-2 text-sm text-[#4A4A3A]">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#30360E] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
            <span>Ative o opt-in de cada proprietário no cadastro deles (aba Proprietários)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#30360E] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
            <span>Toda segunda às 8h, a Cora gera automaticamente um resumo semanal com leads e visitas do imóvel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#30360E] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
            <span>O relatório é enviado por WhatsApp (ou email) com o nome e voz do corretor</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#30360E] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">4</span>
            <span>O proprietário se sente informado e o corretor reforça sua credibilidade automaticamente</span>
          </li>
        </ol>
      </div>

      <DiarioClient initialLandlords={landlords ?? []} recentLogs={logs ?? []} />
    </div>
  )
}
