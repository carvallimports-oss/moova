import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const REPLICATE_MODEL_VERSION = "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.REPLICATE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de edição de fotos não configurado. Adicione REPLICATE_API_KEY nas variáveis de ambiente." },
      { status: 503 }
    )
  }

  const { image_url, property_id } = await req.json()
  if (!image_url) return NextResponse.json({ error: "image_url obrigatório" }, { status: 400 })

  // Create prediction
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: { image: image_url, scale: 2, face_enhance: false },
    }),
  })
  const prediction = await createRes.json()
  if (!prediction.id) return NextResponse.json({ error: "Falha ao iniciar processamento" }, { status: 500 })

  // Poll up to 90 seconds
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    const data = await pollRes.json()
    if (data.status === "succeeded") {
      const enhanced_url = Array.isArray(data.output) ? data.output[0] : data.output
      if (property_id) {
        await supabase.from("property_media").insert({
          property_id,
          user_id: user.id,
          type: "photo_edited",
          url: enhanced_url,
          storage_path: null,
          metadata: { original_url: image_url, model: "real-esrgan", scale: 2 },
        })
      }
      return NextResponse.json({ enhanced_url })
    }
    if (data.status === "failed") {
      return NextResponse.json({ error: "Falha no processamento da imagem" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Timeout ao processar imagem. Tente novamente." }, { status: 408 })
}
