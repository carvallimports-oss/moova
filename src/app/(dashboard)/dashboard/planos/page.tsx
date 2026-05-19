import { createClient } from "@/lib/supabase/server"
import { PlansClient } from "@/components/dashboard/plans-client"

export const dynamic = "force-dynamic"

export default async function PlanosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .single()

  const currentPlan = (subscription?.plan ?? "evolution") as string

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Planos Moova</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">
          Evolua conforme seu volume cresce — de assistente a operadora.
        </p>
      </div>
      <PlansClient currentPlan={currentPlan} />
    </div>
  )
}
