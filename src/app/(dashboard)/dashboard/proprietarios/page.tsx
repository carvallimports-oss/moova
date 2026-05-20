import { createClient } from "@/lib/supabase/server"
import { ProprietariosClient } from "@/components/dashboard/proprietarios-client"

export const dynamic = "force-dynamic"

const COLUMNS: { status: string; label: string }[] = [
  { status: "prospeccao", label: "Prospecção" },
  { status: "em_contato", label: "Em contato" },
  { status: "negociando_exclusividade", label: "Neg. exclusividade" },
  { status: "captado", label: "Captado" },
  { status: "em_publicacao", label: "Em publicação" },
  { status: "vendido", label: "Vendido" },
  { status: "retomado", label: "Retomado" },
]

export default async function ProprietariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: landlords } = await supabase
    .from("landlord_profiles")
    .select("id, name, phone, email, status, exclusivity, next_action, next_action_at, diario_optin, origin, created_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#30360E]">Proprietários</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Pipeline de captação de imóveis — {landlords?.length ?? 0} proprietários</p>
      </div>
      <ProprietariosClient initialLandlords={landlords ?? []} columns={COLUMNS} />
    </div>
  )
}
