import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("captacao_optin_leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, phone, email, property_address, property_type, estimated_value, optin_source, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  const { data, error } = await supabase
    .from("captacao_optin_leads")
    .insert({
      user_id: user.id,
      name,
      phone,
      email,
      property_address,
      property_type,
      estimated_value,
      optin_source: optin_source ?? "contato_existente",
      notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
