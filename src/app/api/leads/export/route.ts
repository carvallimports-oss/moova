import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const temperature = searchParams.get("temperature")

  let query = supabase
    .from("leads")
    .select("name, phone, status, temperature, estimated_budget, region, next_action, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (temperature) query = query.eq("temperature", temperature)

  const { data: leads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const STATUS_PT: Record<string, string> = {
    novo: "Novo", qualificado: "Qualificado", em_consideracao: "Em consideração",
    visita_agendada: "Visita agendada", visitou: "Visitou",
    em_negociacao: "Em negociação", fechou: "Fechou", perdido: "Perdido",
  }

  const headers = ["Nome", "Telefone", "Status", "Temperatura", "Budget (R$)", "Região", "Próxima ação", "Observações", "Criado em"]
  const rows = (leads ?? []).map((l) => [
    l.name,
    l.phone,
    STATUS_PT[l.status] ?? l.status,
    l.temperature ?? "",
    l.estimated_budget ?? "",
    l.region ?? "",
    l.next_action ?? "",
    l.notes ?? "",
    new Date(l.created_at).toLocaleDateString("pt-BR"),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-moova-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
