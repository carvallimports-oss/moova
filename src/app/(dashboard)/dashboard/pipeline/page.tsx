import { createClient } from "@/lib/supabase/server"
import { PipelineClient } from "@/components/dashboard/pipeline-client"
import Link from "next/link"

export const dynamic = "force-dynamic"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Download } from "lucide-react"

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, status, temperature, estimated_budget, last_contact_at, next_action")
    .eq("user_id", user!.id)
    .neq("status", "perdido")
    .order("updated_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#30360E]">Pipeline</h1>
          <p className="text-sm text-[#7A7A6A] mt-1">{leads?.length ?? 0} leads ativos</p>
        </div>
        <Link href="/api/leads/export" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-[#D4C5A0] text-[#4A4A3A] gap-2")}>
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Link>
      </div>
      <PipelineClient initialLeads={leads ?? []} />
    </div>
  )
}
