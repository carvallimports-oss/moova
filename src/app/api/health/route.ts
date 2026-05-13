import { NextResponse } from "next/server"
import { checkAIHealth } from "@/lib/ai/cora"

export const dynamic = "force-dynamic"

export async function GET() {
  const aiHealth = await checkAIHealth()

  const evolutionOk = await fetch(`${process.env.EVOLUTION_API_URL}/health`, {
    headers: { apikey: process.env.EVOLUTION_API_KEY ?? "" },
    signal: AbortSignal.timeout(5000),
  }).then(() => true).catch(() => false)

  const status = {
    ok: aiHealth.anyAvailable,
    timestamp: new Date().toISOString(),
    services: {
      openai: aiHealth.openai,
      anthropic: aiHealth.anthropic,
      evolution: evolutionOk ? "ok" : "degraded",
    },
  }

  return NextResponse.json(status, {
    status: status.ok ? 200 : 503,
  })
}
