import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { VisitasClient } from "@/components/dashboard/visitas-client"

export const dynamic = "force-dynamic"

export default async function VisitasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: visits }, { data: leads }] = await Promise.all([
    supabase
      .from("visits")
      .select(`
        id, scheduled_at, status, notes, address,
        leads(id, name, phone, temperature)
      `)
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, name")
      .eq("user_id", user.id)
      .not("status", "in", '("perdido","fechou")')
      .order("name", { ascending: true }),
  ])

  const upcoming = (visits ?? []).filter(
    (v) => new Date(v.scheduled_at) >= new Date() && v.status !== "cancelada" && v.status !== "realizada"
  )

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Visitas</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">
          {upcoming.length} visita{upcoming.length !== 1 ? "s" : ""} agendada{upcoming.length !== 1 ? "s" : ""}
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <VisitasClient initialVisits={(visits ?? []) as any} availableLeads={(leads ?? []) as { id: string; name: string }[]} />
    </div>
  )
}
