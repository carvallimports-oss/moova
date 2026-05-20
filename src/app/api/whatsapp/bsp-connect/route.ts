import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function subscribeWABA(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message: string } }
    console.warn(`[bsp] subscribed_apps falhou para WABA ${wabaId}:`, err?.error?.message ?? res.status)
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { phone_number_id, waba_id, access_token, display_phone } = await req.json() as {
    phone_number_id: string
    waba_id?: string
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
      bsp_waba_id: waba_id ?? null,
      bsp_access_token: access_token,
      phone_number: display_phone ?? null,
      status: "connected",
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  // Subscribe app to WABA webhooks if we have the WABA ID
  if (waba_id) {
    await subscribeWABA(waba_id, access_token)
  }

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
