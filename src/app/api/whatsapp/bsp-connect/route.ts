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

  // Validate the token + phone_number_id against Meta API
  const verifyRes = await fetch(
    `https://graph.facebook.com/v19.0/${phone_number_id}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )

  if (!verifyRes.ok) {
    const err = await verifyRes.json() as Record<string, unknown>
    const msg = (err.error as Record<string, unknown>)?.message ?? "Credenciais inválidas"
    return NextResponse.json({ error: `Meta API: ${msg}` }, { status: 400 })
  }

  const meta = await verifyRes.json() as { display_phone_number?: string; verified_name?: string }

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from("whatsapp_accounts")
    .upsert({
      user_id: user.id,
      provider: "bsp",
      bsp_phone_number_id: phone_number_id,
      bsp_waba_id: waba_id || null,
      bsp_access_token: access_token,
      phone_number: display_phone ?? meta.display_phone_number ?? null,
      status: "connected",
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  return NextResponse.json({
    ok: true,
    phone: meta.display_phone_number,
    name: meta.verified_name,
  })
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
