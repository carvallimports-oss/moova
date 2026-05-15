// ElevenLabs TTS + OpenAI Whisper STT

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL" // Rachel — pt-BR compatible

export async function textToSpeech(text: string, voiceId?: string): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set")

  const effectiveVoiceId = voiceId ?? DEFAULT_VOICE_ID

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${effectiveVoiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function speechToText(audioBuffer: Uint8Array, mimeType = "audio/ogg"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not set")

  const formData = new FormData()
  const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: mimeType })
  formData.append("file", blob, "audio.ogg")
  formData.append("model", "whisper-1")
  formData.append("language", "pt")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper STT failed (${res.status}): ${err}`)
  }

  const data = await res.json() as { text: string }
  return data.text
}
