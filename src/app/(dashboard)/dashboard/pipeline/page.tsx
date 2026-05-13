import { createClient } from "@/lib/supabase/server"
import { KanbanBoard } from "@/components/dashboard/kanban-board"

const STAGES = [
  { key: "novo", label: "Novo" },
  { key: "qualificado", label: "Qualificado" },
  { key: "em_consideracao", label: "Em consideração" },
  { key: "visita_agendada", label: "Visita agendada" },
  { key: "visitou", label: "Visitou" },
  { key: "em_negociacao", label: "Em negociação" },
  { key: "fechou", label: "Fechou" },
]

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, status, temperature, estimated_budget, last_contact_at, next_action")
    .eq("user_id", user!.id)
    .neq("status", "perdido")
    .order("updated_at", { ascending: false })

  const grouped = STAGES.reduce<Record<string, typeof leads>>((acc, stage) => {
    acc[stage.key] = (leads ?? []).filter((l) => l.status === stage.key)
    return acc
  }, {})

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 space-y-6 h-full flex flex-col">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Pipeline</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">{leads?.length ?? 0} leads ativos</p>
      </div>
      <KanbanBoard stages={STAGES} grouped={grouped} />
    </div>
  )
}
