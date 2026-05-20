import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {

  const body = await req.json()

  if (body.event === "QRCODE_UPDATED") {
    await handleQrCodeUpdated(body)
    return NextResponse.json({ ok: true })
  }

  // Handle Evolution API CONNECTION_UPDATE events
  if (body.event === "CONNECTION_UPDATE") {
    await handleConnectionUpdate(body)
    return NextResponse.json({ ok: true })
  }

  const provider = createWhatsAppProvider("evolution")
  const incoming = provider.parseWebhook(body)

  if (!incoming) {
    return NextResponse.json({ ok: true })
  }

  const instanceName = (body as Record<string, unknown>).instance as string | undefined

  try {
    await inngest.send({
      name: "whatsapp/message.received",
      data: {
        from: incoming.from,
        type: incoming.type,
        text: incoming.text,
        audioBase64: incoming.audioBase64,
        imageUrl: incoming.imageUrl,
        timestamp: incoming.timestamp,
        messageId: incoming.messageId,
        instanceName,
      },
    })
  } catch (err) {
    console.error("[evo-webhook] inngest.send failed:", err)
  }

  return NextResponse.json({ ok: true })
}

async function handleQrCodeUpdated(body: Record<string, unknown>) {
  try {
    const instance = body.instance as string
    const data = body.data as Record<string, unknown>
    const qr = (data?.qrcode as Record<string, unknown>)?.base64 as string | undefined
    if (!instance || !qr) return

    const supabase = createAdminClient()
    await supabase
      .from("whatsapp_accounts")
      .update({ qr_code: qr, status: "qr_pending" })
      .eq("instance_name", instance)
  } catch {}
}

async function handleConnectionUpdate(body: Record<string, unknown>) {
  try {
    const instance = body.instance as string
    const state = (body.data as Record<string, unknown>)?.state as string
    if (!instance || !state) return

    const supabase = createAdminClient()
    const statusMap: Record<string, string> = {
      open: "connected",
      close: "disconnected",
      connecting: "qr_pending",
    }
    const status = statusMap[state] ?? "disconnected"

    await supabase
      .from("whatsapp_accounts")
      .update({ status, ...(state === "open" ? { qr_code: null } : {}) })
      .eq("instance_name", instance)
  } catch {
    // Non-critical — log and continue
  }
}
