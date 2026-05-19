import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Recebe até 5 áudios em base64 e cria uma voz clonada no ElevenLabs
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 })

  const body = await req.json() as { audios: string[]; name?: string }
  if (!body.audios || body.audios.length === 0) {
    return NextResponse.json({ error: "Nenhum áudio enviado" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("users")
    .select("broker_name, name")
    .eq("id", user.id)
    .single()

  const brokerName = profile?.broker_name ?? profile?.name ?? "Corretor"
  const voiceName = body.name ?? `Nara — ${brokerName}`

  const formData = new FormData()
  formData.append("name", voiceName)
  formData.append("description", `Voz clonada da Nara para o corretor ${brokerName} — Moova`)

  for (let i = 0; i < Math.min(body.audios.length, 5); i++) {
    const audio = body.audios[i]
    const base64 = audio.includes(",") ? audio.split(",")[1] : audio
    const audioBuffer = Buffer.from(base64, "base64")
    const blob = new Blob([audioBuffer], { type: "audio/webm" })
    formData.append("files", blob, `audio_${i + 1}.webm`)
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `ElevenLabs error: ${err}` }, { status: 502 })
  }

  const data = await res.json() as { voice_id: string }
  const voiceId = data.voice_id

  // Salvar voice_id no perfil do usuário
  await supabase.from("users").update({ eleven_labs_voice_id: voiceId }).eq("id", user.id)

  // Registrar consentimento de uso de voz (LGPD)
  await supabase.from("compliance_consents").insert({
    user_id: user.id,
    type: "broker_voice",
  })

  return NextResponse.json({ voiceId, message: "Voz clonada com sucesso" })
}

// Deletar voz clonada (direito de exclusão LGPD)
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("eleven_labs_voice_id")
    .eq("id", user.id)
    .single()

  if (profile?.eleven_labs_voice_id) {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (apiKey) {
      await fetch(`https://api.elevenlabs.io/v1/voices/${profile.eleven_labs_voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      })
    }

    await supabase.from("users")
      .update({ eleven_labs_voice_id: null })
      .eq("id", user.id)
  }

  return NextResponse.json({ deleted: true })
}
