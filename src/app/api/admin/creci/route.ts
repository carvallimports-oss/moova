import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "carvallimports@gmail.com"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("creci_validations")
    .select("*, users(id, name, email, creci, phone, created_at)")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["valid", "invalid", "manual"]),
  notes: z.string().optional(),
})

export async function PATCH(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("creci_validations")
    .update({
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      validated_at: new Date().toISOString(),
      source: "manual",
    })
    .eq("id", parsed.data.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
