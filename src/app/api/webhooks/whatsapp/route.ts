import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

export const dynamic = "force-dynamic"

// Validate that the request comes from our Evolution API instance
function isValidEvolutionRequest(req: NextRequest): boolean {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret) return true // No secret configured — skip validation in dev
  const header = req.headers.get("apikey") ?? req.headers.get("x-api-key") ?? ""
  return header === secret
}

export async function POST(req: NextRequest) {
  if (!isValidEvolutionRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()

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

  return NextResponse.json({ ok: true })
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
      connecting: "connecting",
    }
    const status = statusMap[state] ?? "unknown"

    await supabase
      .from("whatsapp_accounts")
      .update({ status })
      .eq("instance_name", instance)
  } catch {
    // Non-critical — log and continue
  }
}
