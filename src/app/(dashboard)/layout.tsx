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

  const [{ data: profile }, { count: pendingApprovals }, { data: diag }] = await Promise.all([
    supabase
      .from("users")
      .select("name, creci, whatsapp_provider")
      .eq("id", user.id)
      .single(),
    supabase
      .from("human_approvals_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("resolved_at", null),
    supabase
      .from("diagnostico_cora_14d")
      .select("started_at, completed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!profile) redirect("/onboarding")

  const diagDay = diag && !diag.completed_at
    ? Math.min(14, Math.floor((Date.now() - new Date(diag.started_at).getTime()) / 86400000) + 1)
    : null

  return (
    <div className="flex h-screen bg-[#FAF7F2] overflow-hidden">
      <DashboardSidebar
        userName={profile.name ?? user.email ?? "Corretor"}
        pendingApprovals={pendingApprovals ?? 0}
        diagDay={diagDay}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
