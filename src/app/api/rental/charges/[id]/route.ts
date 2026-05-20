import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  if (body.status === "pago" && !body.paid_at) body.paid_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("rental_charges")
    .update(body)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status === "pago" && data) {
    const { data: contract } = await supabase
      .from("rental_contracts")
      .select("admin_fee_pct")
      .eq("id", data.contract_id)
      .single()

    if (contract) {
      const feeDecimal = (contract.admin_fee_pct ?? 10) / 100
      const gross = data.rent_value
      const fee = parseFloat((gross * feeDecimal).toFixed(2))
      const net = parseFloat((gross - fee).toFixed(2))

      await supabase.from("rental_payouts").insert({
        contract_id: data.contract_id,
        user_id: user.id,
        charge_id: data.id,
        reference_month: data.reference_month,
        gross_value: gross,
        admin_fee: fee,
        net_value: net,
        status: "pendente",
      })
    }
  }

  return NextResponse.json(data)
}
