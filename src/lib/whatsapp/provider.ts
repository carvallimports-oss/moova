// WhatsAppProvider — camada de abstração desde Sprint 1
// Suporta Evolution API (MVP) e BSP oficial (v1.1: Twilio/360dialog/Gupshup)

export type WhatsAppProviderType = "evolution" | "bsp"

export interface SendMessagePayload {
  to: string       // número destino E.164 ex: 5511999999999
  text?: string
  audioBase64?: string
  imageUrl?: string
  mimeType?: string
}

export interface IncomingMessage {
  from: string
  type: "text" | "audio" | "image"
  text?: string
  audioBase64?: string
  imageUrl?: string
  timestamp: number
  messageId: string
}

interface WhatsAppAdapter {
  sendMessage(payload: SendMessagePayload): Promise<void>
  parseWebhook(body: unknown): IncomingMessage | null
}

// ── Evolution API ────────────────────────────────────────────────────────────

class EvolutionAdapter implements WhatsAppAdapter {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL!
    this.apiKey = process.env.EVOLUTION_API_KEY!
  }

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    if (payload.text) {
      await fetch(`${this.baseUrl}/message/sendText/moova`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({ number: payload.to, text: payload.text }),
      })
    }
    if (payload.audioBase64) {
      await fetch(`${this.baseUrl}/message/sendMedia/moova`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({
          number: payload.to,
          mediatype: "audio",
          media: payload.audioBase64,
        }),
      })
    }
  }

  parseWebhook(body: unknown): IncomingMessage | null {
    const b = body as Record<string, unknown>
    if (!b?.data) return null
    const data = b.data as Record<string, unknown>
    const msg = data.message as Record<string, unknown>
    if (!msg) return null

    return {
      from: data.key
        ? (data.key as Record<string, unknown>).remoteJid as string
        : "",
      type: msg.audioMessage ? "audio" : msg.imageMessage ? "image" : "text",
      text: (msg.conversation as string) ?? (msg.extendedTextMessage as Record<string, unknown>)?.text as string,
      timestamp: (data.messageTimestamp as number) ?? Date.now(),
      messageId: (data.key as Record<string, unknown>)?.id as string,
    }
  }
}

// ── BSP (v1.1 — placeholder) ─────────────────────────────────────────────────

class BSPAdapter implements WhatsAppAdapter {
  async sendMessage(_payload: SendMessagePayload): Promise<void> {
    throw new Error("BSP adapter not implemented — scheduled for v1.1")
  }
  parseWebhook(_body: unknown): IncomingMessage | null {
    throw new Error("BSP adapter not implemented — scheduled for v1.1")
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createWhatsAppProvider(type: WhatsAppProviderType): WhatsAppAdapter {
  switch (type) {
    case "evolution":
      return new EvolutionAdapter()
    case "bsp":
      return new BSPAdapter()
  }
}
