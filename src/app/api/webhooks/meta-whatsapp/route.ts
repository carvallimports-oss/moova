import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { BSPAdapter } from "@/lib/whatsapp/provider"
import { createHmac } from "crypto"

export const dynamic = "force-dynamic"

// ── GET — Meta webhook verification ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.META_WA_VERIFY_TOKEN
  if (!verifyToken) {
    return new Response("META_WA_VERIFY_TOKEN not configured", { status: 500 })
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 })
  }

  return new Response("Forbidden", { status: 403 })
}

// ── POST — Incoming messages from Meta Cloud API ──────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Validate X-Hub-Signature-256
  if (!validateMetaSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Find the broker by phone_number_id
  const phoneNumberId = BSPAdapter.getPhoneNumberId(body)
  if (!phoneNumberId) {
    // Could be a status update — return 200 so Meta doesn't retry
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()
  const { data: waAccount } = await supabase
    .from("whatsapp_accounts")
    .select("user_id, bsp_access_token, bsp_phone_number_id")
    .eq("bsp_phone_number_id", phoneNumberId)
    .single()

  if (!waAccount) {
    return NextResponse.json({ ok: true }) // unknown number, ignore
  }

  // Parse the incoming message
  const adapter = new BSPAdapter(
    waAccount.bsp_phone_number_id!,
    waAccount.bsp_access_token!
  )
  const incoming = adapter.parseWebhook(body)
  if (!incoming) {
    return NextResponse.json({ ok: true }) // status/reaction — ignore
  }

  // Handle BSP audio: media_id must be downloaded async
  let audioBase64: string | undefined
  let imageUrl: string | undefined

  if (incoming.type === "audio" && incoming.text?.startsWith("__bsp_audio__")) {
    const mediaId = incoming.text.replace("__bsp_audio__", "")
    audioBase64 = (await adapter.downloadMedia(mediaId)) ?? undefined
    incoming.text = undefined
  }

  if (incoming.type === "image" && incoming.text?.startsWith("__bsp_image__")) {
    const mediaId = incoming.text.replace("__bsp_image__", "")
    // For images, download as base64 then convert to data URL for GPT-4o Vision
    const b64 = await adapter.downloadMedia(mediaId)
    imageUrl = b64 ? `data:image/jpeg;base64,${b64}` : undefined
    incoming.text = undefined
  }

  try {
    await inngest.send({
      name: "whatsapp/message.received",
      data: {
        from: incoming.from,
        type: incoming.type,
        text: incoming.text,
        audioBase64,
        imageUrl,
        timestamp: incoming.timestamp,
        messageId: incoming.messageId,
        bspPhoneNumberId: phoneNumberId,
      },
    })
  } catch (err) {
    console.error("[meta-webhook] inngest.send failed:", err)
  }

  return NextResponse.json({ ok: true })
}

function validateMetaSignature(req: NextRequest, rawBody: string): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return true // skip in dev

  const signature = req.headers.get("x-hub-signature-256")
  if (!signature) return false

  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex")
  return signature === expected
}
