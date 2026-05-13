import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("name, creci, whatsapp_provider")
    .eq("id", user.id)
    .single()

  // Usuário autenticado mas sem perfil → onboarding
  if (!profile) redirect("/onboarding")

  return (
    <div className="flex h-screen bg-[#FAF7F2] overflow-hidden">
      <DashboardSidebar userName={profile.name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
