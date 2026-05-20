import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { AdminCreciClient } from "@/components/admin/admin-creci-client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "carvallimports@gmail.com"

export default async function AdminCreciPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login")

  const admin = createAdminClient()
  const { data: validations } = await admin
    .from("creci_validations")
    .select("*, users(id, name, email, creci, phone, created_at)")
    .order("created_at", { ascending: false })

  const pending = (validations ?? []).filter((v) => v.status === "pending")
  const resolved = (validations ?? []).filter((v) => v.status !== "pending")

  return (
    <div className="min-h-screen bg-[#F5F0E0] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-xs text-[#787F56] uppercase tracking-widest font-mono">Admin</p>
          <h1 className="font-serif text-3xl text-[#30360E] mt-1">Validação CRECI</h1>
          <p className="text-sm text-[#7A7A6A] mt-1">
            {pending.length} pendente{pending.length !== 1 ? "s" : ""} · {resolved.length} resolvido{resolved.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <AdminCreciClient pending={pending as any} resolved={resolved as any} />
      </div>
    </div>
  )
}
