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
    return NextResponse.json({ error: "Evolution API não configurada no servidor" }, { status: 503 })
  }

  const instanceName = `moova_${user.id.replace(/-/g, "").slice(0, 16)}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const adminSupabase = createAdminClient()

  // Clear stale QR and set status
  await adminSupabase
    .from("whatsapp_accounts")
    .upsert(
      { user_id: user.id, instance_name: instanceName, status: "qr_pending", qr_code: null, provider: "evolution" },
      { onConflict: "user_id" }
    )

  // Delete existing instance to force a clean state (ensures new QR)
  await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: { apikey: evolutionKey },
  }).catch(() => {})

  await new Promise(r => setTimeout(r, 1000))

  // Create fresh instance
  const webhookUrl = appUrl && !appUrl.includes("localhost")
    ? `${appUrl}/api/webhooks/whatsapp`
    : `https://moovaimob.com/api/webhooks/whatsapp`
  const body: Record<string, unknown> = {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    webhook: {
      url: webhookUrl,
      byEvents: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    },
  }

  const createRes = await fetch(`${evolutionUrl}/instance/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: evolutionKey },
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({})) as { response?: { message?: string | string[] } }
    const msg = Array.isArray(err.response?.message) ? err.response!.message![0] : (err.response?.message ?? "Erro ao criar instância")
    return NextResponse.json({ error: `Evolution API: ${msg}` }, { status: 502 })
  }

  // Poll for QR — Evolution API v2 generates it asynchronously via Baileys
  // Returns early (after 12s max) so client can show status
  let qr: string | null = null
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 3000))
    try {
      const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: evolutionKey },
      })
      if (qrRes.ok) {
        const data = await qrRes.json() as Record<string, unknown>
        const base64 =
          (data as { base64?: string }).base64 ??
          (data as { qrcode?: { base64?: string } }).qrcode?.base64 ??
          (typeof (data as { qrcode?: unknown }).qrcode === "string" ? (data as { qrcode: string }).qrcode : null) ??
          null
        if (base64) {
          qr = base64
          await adminSupabase
            .from("whatsapp_accounts")
            .update({ qr_code: qr })
            .eq("user_id", user.id)
          break
        }
      }
    } catch { /* continue polling */ }
  }

  if (!qr) {
    // Check if server is fundamentally unable to connect
    const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey: evolutionKey },
    }).catch(() => null)
    const stateData = stateRes?.ok ? await stateRes.json() as Record<string, unknown> : null
    const state = (stateData?.instance as Record<string, unknown> | undefined)?.state ?? "unknown"

    if (state === "connecting" || state === "close") {
      return NextResponse.json({
        error: "A Evolution API não conseguiu conectar ao WhatsApp. O servidor pode estar com restrição de rede. Use a opção Meta (API Oficial) acima — é mais estável.",
        evolutionState: state,
      }, { status: 503 })
    }
  }

  return NextResponse.json({ ok: true, instanceName, qr })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = `moova_${user.id.replace(/-/g, "").slice(0, 16)}`

  if (evolutionUrl && evolutionKey) {
    await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: evolutionKey },
    }).catch(() => {})
    await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: evolutionKey },
    }).catch(() => {})
  }

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from("whatsapp_accounts")
    .update({ status: "disconnected", qr_code: null, instance_name: null })
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}
