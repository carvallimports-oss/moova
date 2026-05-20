import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { phone_number_id, waba_id, access_token, display_phone } = await req.json() as {
    phone_number_id: string
    waba_id: string
    access_token: string
    display_phone?: string
  }

  if (!phone_number_id || !access_token) {
    return NextResponse.json({ error: "phone_number_id e access_token são obrigatórios" }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from("whatsapp_accounts")
    .upsert({
      user_id: user.id,
      provider: "bsp",
      bsp_phone_number_id: phone_number_id,
      bsp_waba_id: waba_id || null,
      bsp_access_token: access_token,
      phone_number: display_phone ?? null,
      status: "connected",
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  return NextResponse.json({ ok: true, phone: display_phone ?? null })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from("whatsapp_accounts")
    .update({
      provider: "evolution",
      bsp_phone_number_id: null,
      bsp_waba_id: null,
      bsp_access_token: null,
      status: "disconnected",
    })
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}
