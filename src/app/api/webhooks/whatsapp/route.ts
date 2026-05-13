import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

// Evolution API envia POST no webhook configurado
export async function POST(req: NextRequest) {
  const body = await req.json()

  const provider = createWhatsAppProvider("evolution")
  const incoming = provider.parseWebhook(body)

  if (!incoming) {
    return NextResponse.json({ ok: true })
  }

  // Enfileira no Inngest para processamento assíncrono
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
    },
  })

  return NextResponse.json({ ok: true })
}
