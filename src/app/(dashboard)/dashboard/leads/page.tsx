import { createClient } from "@/lib/supabase/server"
import { LeadsTable } from "@/components/dashboard/leads-table"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Download } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, status, temperature, estimated_budget, region, last_contact_at, next_action, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Leads</h1>
          <p className="text-sm text-[#8A8A8A] mt-1">{leads?.length ?? 0} leads no total</p>
        </div>
        <Link href="/api/leads/export" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#E0D8CE] text-[#5A5A5A] gap-2")}>
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Link>
      </div>
      <LeadsTable initialLeads={leads ?? []} />
    </div>
  )
}
