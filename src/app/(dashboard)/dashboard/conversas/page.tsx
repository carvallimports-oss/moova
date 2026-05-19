import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ConversasList } from "@/components/dashboard/conversas-list"

export const dynamic = "force-dynamic"

export default async function ConversasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, is_active, broker_took_over, updated_at,
      leads (id, name, phone, temperature, status),
      messages (id, content, sender, requires_approval, created_at, flags)
    `)
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(50)

  const { count: pendingApprovals } = await supabase
    .from("human_approvals_queue")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .is("resolved_at", null)

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Conversas</h1>
          <p className="text-sm text-[#8A8A8A] mt-1">
            {conversations?.length ?? 0} conversas ativas
          </p>
        </div>
        {(pendingApprovals ?? 0) > 0 && (
          <Badge className="bg-[#B87333] text-white text-xs px-3 py-1.5">
            {pendingApprovals} aguardando aprovação
          </Badge>
        )}
      </div>

      {(pendingApprovals ?? 0) > 0 && (
        <Card className="border-[#B87333]/40 bg-[#B87333]/5">
          <CardContent className="p-4 text-sm text-[#B87333] font-medium">
            A Nara está aguardando sua aprovação em {pendingApprovals} mensagem(ns) crítica(s).
            Verifique a fila abaixo para não atrasar o atendimento.
          </CardContent>
        </Card>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  <ConversasList conversations={(conversations ?? []) as any} />
    </div>
  )
}
