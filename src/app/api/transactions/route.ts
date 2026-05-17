import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  lead_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  commission: z.number().positive(),
  closed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("transactions")
    .select("*, leads(id, name), properties(id, title)")
    .eq("user_id", user.id)
    .order("closed_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from("transactions")
    .insert({ user_id: user.id, ...parsed.data })
    .select("*, leads(id, name), properties(id, title)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update lead status to fechou when a transaction is registered
  if (parsed.data.lead_id) {
    await supabase
      .from("leads")
      .update({ status: "fechou" })
      .eq("id", parsed.data.lead_id)
      .eq("user_id", user.id)
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "transaction_created",
    entity_type: "transaction",
    entity_id: data.id,
    metadata: { commission: parsed.data.commission, description: parsed.data.description },
  })

  return NextResponse.json(data, { status: 201 })
}
