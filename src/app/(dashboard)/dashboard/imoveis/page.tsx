import { createClient } from "@/lib/supabase/server"
import { ImoveisClient } from "@/components/dashboard/imoveis-client"

export const dynamic = "force-dynamic"

export default async function ImoveisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user!.id)
    .eq("active", true)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <ImoveisClient initialProperties={properties ?? []} />
    </div>
  )
}
