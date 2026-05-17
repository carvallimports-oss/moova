import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET /api/leads/[id]/lgpd — portabilidade: devolve todos os dados do lead
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [lead, messages, visits, consents] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("messages").select("content, type, sender, created_at").eq("lead_id", id).eq("user_id", user.id),
    supabase.from("visits").select("scheduled_at, status, notes").eq("lead_id", id).eq("user_id", user.id),
    supabase.from("compliance_consents").select("type, accepted_at").eq("lead_phone", (await supabase.from("leads").select("phone").eq("id", id).single()).data?.phone ?? ""),
  ])

  if (lead.error || !lead.data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const exportData = {
    exportedAt: new Date().toISOString(),
    lead: lead.data,
    messages: messages.data ?? [],
    visits: visits.data ?? [],
    consents: consents.data ?? [],
  }

  const adminClient = createAdminClient()
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    action: "lgpd_export",
    entity_type: "lead",
    entity_id: id,
    payload: { phone: lead.data.phone, exportedAt: exportData.exportedAt },
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lead-${id}-lgpd.json"`,
    },
  })
}

// DELETE /api/leads/[id]/lgpd — solicita e executa exclusão imediata (anonimização LGPD)
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: lead } = await supabase.from("leads").select("phone, name").eq("id", id).eq("user_id", user.id).single()
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const adminClient = createAdminClient()

  // Anonimiza dados pessoais — mantém histórico estrutural (LGPD art. 18)
  await adminClient.from("leads").update({
    name: "Lead Removido",
    phone: `anon_${id.substring(0, 8)}`,
    email: null,
    notes: null,
    estimated_budget: null,
    region: null,
    next_action: null,
    lgpd_optout_at: new Date().toISOString(),
    lgpd_deletion_requested_at: new Date().toISOString(),
  }).eq("id", id)

  // Anonimiza mensagens do lead
  await adminClient.from("messages")
    .update({ content: "[mensagem removida — LGPD]" })
    .eq("lead_id", id)
    .eq("sender", "lead")

  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    action: "lgpd_deletion",
    entity_type: "lead",
    entity_id: id,
    payload: { originalPhone: lead.phone, executedAt: new Date().toISOString() },
  })

  return NextResponse.json({ ok: true, message: "Dados do lead anonimizados conforme LGPD." })
}
