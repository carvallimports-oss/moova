import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createVisitSchema = z.object({
  lead_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createVisitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verify lead belongs to broker
  const { data: lead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("id", parsed.data.lead_id)
    .eq("user_id", user.id)
    .single()

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("visits")
    .insert({
      user_id: user.id,
      lead_id: parsed.data.lead_id,
      scheduled_at: parsed.data.scheduled_at,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      status: "pendente",
    })
    .select(`id, scheduled_at, status, notes, address, leads(id, name, phone, temperature)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update lead status to visita_agendada
  await supabase
    .from("leads")
    .update({ status: "visita_agendada" })
    .eq("id", parsed.data.lead_id)
    .eq("user_id", user.id)

  // Update diagnostico visits_scheduled counter
  const { data: diag } = await supabase
    .from("diagnostico_cora_14d")
    .select("id, visits_scheduled")
    .eq("user_id", user.id)
    .eq("converted_to_subscription", false)
    .gt("ends_at", new Date().toISOString())
    .single()

  if (diag) {
    await supabase
      .from("diagnostico_cora_14d")
      .update({ visits_scheduled: (diag.visits_scheduled ?? 0) + 1 })
      .eq("id", diag.id)
  }

  return NextResponse.json(data, { status: 201 })
}
