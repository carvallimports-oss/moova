import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
  status: z.enum(["prospeccao","em_contato","negociando_exclusividade","captado","em_publicacao","vendido","retomado"]).default("prospeccao"),
  exclusivity: z.boolean().default(false),
  property_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  next_action: z.string().optional(),
  next_action_at: z.string().datetime().optional(),
  origin: z.enum(["portal_moova","contato_existente","anuncio_publico","whatsapp_opt_in"]).optional(),
  diario_optin: z.boolean().default(false),
  diario_contact: z.enum(["whatsapp","email"]).optional(),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("landlord_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
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
    .from("landlord_profiles")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
