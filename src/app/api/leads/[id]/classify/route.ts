import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { classifyLead } from "@/lib/ai/classify-lead"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, name, phone, estimated_budget, region, notes, temperature")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  // Fetch recent messages for context
  const { data: conversations } = await admin
    .from("conversations")
    .select("messages(content, sender, created_at)")
    .eq("lead_id", id)
    .limit(1)

  const messages = (conversations?.[0] as any)?.messages ?? []
  const messageHistory: string[] = messages
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-20)
    .map((m: any) => `[${m.sender}] ${m.content}`)

  const result = await classifyLead({
    name: lead.name,
    messageHistory,
    estimatedBudget: lead.estimated_budget ?? undefined,
    region: lead.region ?? undefined,
    notes: lead.notes ?? undefined,
  })

  // Persist the classification
  await supabase
    .from("leads")
    .update({
      temperature: result.temperature,
      next_action: result.nextAction,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json(result)
}
