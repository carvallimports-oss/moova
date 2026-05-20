import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: "Evolution API não configurada" }, { status: 503 })
  }

  const instanceName = `moova_${user.id.replace(/-/g, "").slice(0, 16)}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const adminSupabase = createAdminClient()

  // Clear stale QR
  await adminSupabase.from("whatsapp_accounts").update({ qr_code: null }).eq("user_id", user.id)

  // Always ensure the account row exists with the correct instance_name
  await adminSupabase.from("whatsapp_accounts").upsert(
    { user_id: user.id, instance_name: instanceName, status: "connecting", qr_code: null },
    { onConflict: "user_id" }
  )

  // Try to create instance (if exists, 422/400 is returned — that's fine)
  const createRes = await fetch(`${evolutionUrl}/instance/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: evolutionKey },
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: appUrl ? `${appUrl}/api/webhooks/whatsapp` : undefined,
      webhookByEvents: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    }),
  })

  if (createRes.ok) {
    // New instance created — QR may be in the create response; store it immediately
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await createRes.json() as Record<string, any>
      const qr: string | null =
        created?.qrcode?.base64 ??
        created?.base64 ??
        created?.qr?.base64 ??
        (typeof created?.qrcode === "string" ? created.qrcode : null) ??
        null
      if (qr) {
        await adminSupabase.from("whatsapp_accounts").update({ qr_code: qr }).eq("user_id", user.id)
      }
    } catch { /* ignore — client will poll */ }
  } else {
    // Instance exists — logout first (clears session), then explicitly reconnect for fresh QR
    await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: evolutionKey },
    }).catch(() => {})
    // Wait for logout to propagate
    await new Promise(r => setTimeout(r, 1500))
    // Trigger reconnect — this causes Evolution API to generate a new QR code
    await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      method: "POST",
      headers: { apikey: evolutionKey },
    }).catch(() => {})
  }

  // Return immediately — client polls /api/whatsapp/qr
  return NextResponse.json({ ok: true, instanceName })
}
