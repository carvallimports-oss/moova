import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contractId = searchParams.get("contract_id")
  const status = searchParams.get("status")

  let query = supabase
    .from("rental_charges")
    .select("*, rental_contracts(tenant_name, address, rent_value)")
    .eq("user_id", user.id)
    .order("due_date", { ascending: false })

  if (contractId) query = query.eq("contract_id", contractId)
  if (status && status !== "todos") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Validate contract belongs to user
  const { data: contract } = await supabase
    .from("rental_contracts")
    .select("id, rent_value, iptu_monthly, condominium, admin_fee_pct")
    .eq("id", body.contract_id)
    .eq("user_id", user.id)
    .single()

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 })

  const total = (body.rent_value ?? contract.rent_value) +
    (body.iptu_value ?? contract.iptu_monthly ?? 0) +
    (body.condominium ?? contract.condominium ?? 0) +
    (body.fine_value ?? 0)

  const { data, error } = await supabase
    .from("rental_charges")
    .insert({ ...body, user_id: user.id, total_value: total })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
