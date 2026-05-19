// WhatsAppProvider — abstração sobre Evolution API e Meta Cloud API (BSP oficial)

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

// ── Evolution API ─────────────────────────────────────────────────────────────

class EvolutionAdapter implements WhatsAppAdapter {
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor(instanceName: string) {
    this.baseUrl = process.env.EVOLUTION_API_URL!
    this.apiKey = process.env.EVOLUTION_API_KEY!
    this.instanceName = instanceName
  }

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    if (payload.text) {
      await fetch(`${this.baseUrl}/message/sendText/${this.instanceName}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({ number: payload.to, text: payload.text }),
      })
    }
    if (payload.audioBase64) {
      await fetch(`${this.baseUrl}/message/sendMedia/${this.instanceName}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({
          number: payload.to,
          mediatype: "audio",
          media: payload.audioBase64,
        }),
      })
    }
    if (payload.imageUrl) {
      await fetch(`${this.baseUrl}/message/sendMedia/${this.instanceName}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({
          number: payload.to,
          mediatype: "image",
          media: payload.imageUrl,
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

    // Ignore status updates, reactions, etc.
    const key = data.key as Record<string, unknown> | undefined
    if (key?.fromMe) return null

    const from = typeof key?.remoteJid === "string" ? key.remoteJid : ""
    const type = msg.audioMessage ? "audio" : msg.imageMessage ? "image" : "text"

    return {
      from,
      type,
      text: (msg.conversation as string) ??
        (msg.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined,
      timestamp: (data.messageTimestamp as number) ?? Math.floor(Date.now() / 1000),
      messageId: (key?.id as string) ?? "",
    }
  }
}

// ── Meta Cloud API (BSP) ──────────────────────────────────────────────────────

class BSPAdapter implements WhatsAppAdapter {
  private phoneNumberId: string
  private accessToken: string

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
  }

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    }

    if (payload.text) {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.to,
          type: "text",
          text: { body: payload.text, preview_url: false },
        }),
      })
    }

    if (payload.audioBase64) {
      // Meta requires uploading media first, then sending by media_id
      const uploadRes = await this.uploadMedia(payload.audioBase64, payload.mimeType ?? "audio/ogg; codecs=opus")
      if (uploadRes) {
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: payload.to,
            type: "audio",
            audio: { id: uploadRes },
          }),
        })
      }
    }

    if (payload.imageUrl) {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.to,
          type: "image",
          image: { link: payload.imageUrl },
        }),
      })
    }
  }

  private async uploadMedia(base64: string, mimeType: string): Promise<string | null> {
    try {
      const raw = base64.replace(/^data:[^;]+;base64,/, "")
      const buffer = Buffer.from(raw, "base64")
      const formData = new FormData()
      formData.append("messaging_product", "whatsapp")
      formData.append("file", new Blob([buffer], { type: mimeType }), "audio.ogg")
      const res = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData,
      })
      const data = await res.json() as Record<string, unknown>
      return (data.id as string) ?? null
    } catch {
      return null
    }
  }

  // Download audio from Meta media endpoint and return as base64
  async downloadMedia(mediaId: string): Promise<string | null> {
    try {
      // Step 1: get download URL
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
      const metaData = await metaRes.json() as Record<string, unknown>
      const downloadUrl = metaData.url as string
      if (!downloadUrl) return null

      // Step 2: download the file
      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
      const arrayBuffer = await fileRes.arrayBuffer()
      return Buffer.from(arrayBuffer).toString("base64")
    } catch {
      return null
    }
  }

  parseWebhook(body: unknown): IncomingMessage | null {
    const b = body as Record<string, unknown>
    if (b.object !== "whatsapp_business_account") return null

    const entries = b.entry as Array<Record<string, unknown>> | undefined
    if (!entries?.length) return null

    const changes = entries[0].changes as Array<Record<string, unknown>> | undefined
    if (!changes?.length) return null

    const value = changes[0].value as Record<string, unknown>
    const messages = value.messages as Array<Record<string, unknown>> | undefined
    if (!messages?.length) return null

    const msg = messages[0]
    const from = msg.from as string
    const id = msg.id as string
    const ts = parseInt(msg.timestamp as string, 10)
    const type = msg.type as string

    if (type === "text") {
      return {
        from,
        type: "text",
        text: (msg.text as Record<string, unknown>)?.body as string | undefined,
        timestamp: ts,
        messageId: id,
      }
    }

    if (type === "audio") {
      return {
        from,
        type: "audio",
        // audioBase64 populated later via downloadMedia()
        timestamp: ts,
        messageId: id,
        // Pass media_id in text for downstream download
        text: `__bsp_audio__${(msg.audio as Record<string, unknown>)?.id}`,
      }
    }

    if (type === "image") {
      return {
        from,
        type: "image",
        timestamp: ts,
        messageId: id,
        text: `__bsp_image__${(msg.image as Record<string, unknown>)?.id}`,
      }
    }

    // ignore status updates, reactions, etc.
    return null
  }

  // Extract phone_number_id from Meta webhook body (for broker lookup)
  static getPhoneNumberId(body: unknown): string | null {
    try {
      const b = body as Record<string, unknown>
      const entries = b.entry as Array<Record<string, unknown>>
      const changes = entries[0].changes as Array<Record<string, unknown>>
      const value = changes[0].value as Record<string, unknown>
      const metadata = value.metadata as Record<string, unknown>
      return (metadata?.phone_number_id as string) ?? null
    } catch {
      return null
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface WhatsAppProviderConfig {
  instanceName?: string    // Evolution: broker's instance_name
  phoneNumberId?: string   // BSP: Meta phone number ID
  accessToken?: string     // BSP: Meta access token
}

export function createWhatsAppProvider(
  type: WhatsAppProviderType,
  config: WhatsAppProviderConfig = {}
): WhatsAppAdapter {
  switch (type) {
    case "evolution":
      return new EvolutionAdapter(config.instanceName ?? "moova")
    case "bsp":
      if (!config.phoneNumberId || !config.accessToken) {
        throw new Error("BSP provider requires phoneNumberId and accessToken")
      }
      return new BSPAdapter(config.phoneNumberId, config.accessToken)
  }
}

export function createBSPAdapterForDownload(phoneNumberId: string, accessToken: string) {
  return new BSPAdapter(phoneNumberId, accessToken)
}

export { BSPAdapter }
