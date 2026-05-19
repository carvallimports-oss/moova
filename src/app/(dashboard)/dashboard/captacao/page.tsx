import { createClient } from "@/lib/supabase/server"
import { CaptacaoClient } from "@/components/dashboard/captacao-client"
import { Target } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CaptacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from("captacao_optin_leads")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Moova Captação</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">CRM de captação opt-in — proprietários que pediram seu serviço.</p>
      </div>

      <div className="bg-[#EAE3D9] rounded-xl p-4 text-xs text-[#5A5A5A]">
        <span className="font-medium text-[#2D4A3E]">Pacto Captação:</span> A Moova prospecta proprietários <strong>apenas</strong> com base em contatos opt-in documentados — quem já está na sua agenda, respondeu seus anúncios ou pediu serviço no seu portal. Nunca scraping ou abordagem não solicitada.
      </div>

      <CaptacaoClient initialLeads={leads ?? []} />
    </div>
  )
}
