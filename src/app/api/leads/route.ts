import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { inngest } from "@/lib/inngest/client"

export const dynamic = "force-dynamic"

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  temperature: z.enum(["QUENTE", "MORNO", "FRIO", "INERTE"]).optional(),
  estimated_budget: z.number().optional(),
  region: z.string().optional(),
  notes: z.string().optional(),
})

const bulkImportSchema = z.object({
  leads: z.array(createLeadSchema),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Suporte a importação em bulk via { leads: [...] }
  if (body.leads && Array.isArray(body.leads)) {
    const parsed = bulkImportSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const rows = parsed.data.leads.map((l) => ({ ...l, user_id: user.id }))
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(rows)
      .select("id")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const leadIds = (inserted ?? []).map((l: { id: string }) => l.id)
    if (leadIds.length > 0) {
      await inngest.send({
        name: "leads/imported",
        data: { userId: user.id, leadIds },
      })
    }

    return NextResponse.json({ imported: leadIds.length }, { status: 201 })
  }

  // Criação individual
  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Classificar automaticamente se não tiver temperatura definida
  if (!parsed.data.temperature && data?.id) {
    await inngest.send({
      name: "leads/imported",
      data: { userId: user.id, leadIds: [data.id] },
    })
  }

  return NextResponse.json(data, { status: 201 })
}
