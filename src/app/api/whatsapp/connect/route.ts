import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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

  // Create or reset instance on Evolution API
  const createRes = await fetch(`${evolutionUrl}/instance/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": evolutionKey },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`,
      webhookByEvents: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    }),
  })

  if (!createRes.ok) {
    // Instance may already exist — try fetching QR directly
    const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      headers: { "apikey": evolutionKey },
    })
    if (!qrRes.ok) {
      return NextResponse.json({ error: "Failed to create WhatsApp instance" }, { status: 502 })
    }
    const qrData = await qrRes.json()
    return NextResponse.json({ qr: qrData.base64 ?? qrData.qrcode?.base64 ?? null, instanceName })
  }

  const createData = await createRes.json()
  const qrBase64 = createData.qrcode?.base64 ?? createData.base64 ?? null

  // Persist instance name for this user
  await supabase
    .from("whatsapp_accounts")
    .upsert({ user_id: user.id, instance_name: instanceName, status: "connecting" }, { onConflict: "user_id" })

  return NextResponse.json({ qr: qrBase64, instanceName })
}
