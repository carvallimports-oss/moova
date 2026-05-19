import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function pollForQr(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  maxAttempts = 15,
  intervalMs = 2000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    try {
      const res = await fetch(`${evolutionUrl}/instance/connect/${instanceName}/`, {
        headers: { apikey: evolutionKey },
      })
      if (res.ok) {
        const data = await res.json()
        const qr = data.base64 ?? data.qrcode?.base64 ?? null
        if (qr) return qr
      }
    } catch {}

    // Also check if QR was stored via webhook
    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from("whatsapp_accounts")
      .select("qr_code")
      .eq("instance_name", instanceName)
      .maybeSingle()
    if (row?.qr_code) return row.qr_code
  }
  return null
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: "Evolution API not configured" }, { status: 503 })
  }

  const instanceName = `moova_${user.id.replace(/-/g, "").slice(0, 16)}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  // Clear any stale QR code from previous attempts
  const adminSupabase = createAdminClient()
  await adminSupabase
    .from("whatsapp_accounts")
    .update({ qr_code: null })
    .eq("user_id", user.id)

  const createRes = await fetch(`${evolutionUrl}/instance/create/`, {
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
    // New instance — persist in DB
    await adminSupabase
      .from("whatsapp_accounts")
      .upsert(
        { user_id: user.id, instance_name: instanceName, status: "connecting", qr_code: null },
        { onConflict: "user_id" }
      )
  } else {
    // Instance already exists — restart to regenerate QR
    await fetch(`${evolutionUrl}/instance/restart/${instanceName}/`, {
      method: "POST",
      headers: { apikey: evolutionKey },
    })
  }

  // Poll until QR is ready (up to ~30 seconds)
  const qr = await pollForQr(evolutionUrl, evolutionKey, instanceName)

  if (!qr) {
    return NextResponse.json({
      error: "QR code não disponível. Verifique se a Evolution API está funcionando corretamente e tente novamente.",
      instanceName,
    }, { status: 502 })
  }

  return NextResponse.json({ qr, instanceName })
}
