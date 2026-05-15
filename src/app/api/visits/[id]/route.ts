import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["pendente", "confirmada", "cancelada", "realizada"]).optional(),
  notes: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from("visits")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When visit is marked as realizada, update lead status to visitou
  if (parsed.data.status === "realizada" && data?.lead_id) {
    await supabase
      .from("leads")
      .update({ status: "visitou" })
      .eq("id", data.lead_id)
      .eq("user_id", user.id)
      .in("status", ["visita_agendada", "qualificado"])
  }

  return NextResponse.json(data)
}
