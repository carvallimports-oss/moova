import { createClient } from "@/lib/supabase/server"
import { ServicosClient } from "@/components/dashboard/servicos-client"

export const dynamic = "force-dynamic"

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: services } = await supabase
    .from("extra_services")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Serviços Extras</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">Laudos, documentação e outros serviços paralelos à corretagem.</p>
      </div>
      <ServicosClient initialServices={services ?? []} />
    </div>
  )
}
