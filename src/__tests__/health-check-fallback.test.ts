import { describe, it, expect, vi, beforeEach } from "vitest"

// Test the AI health check fallback logic (modo degradado)
// Rule: if BOTH OpenAI AND Anthropic fail >60s or error, enter degraded mode

type AIProvider = "openai" | "anthropic"
type HealthStatus = "healthy" | "degraded" | "down"

type ProviderResult = {
  provider: AIProvider
  ok: boolean
  latencyMs: number
  error?: string
}

function computeSystemHealth(results: ProviderResult[]): HealthStatus {
  const allDown = results.every((r) => !r.ok)
  if (allDown) return "degraded"

  const anyHealthy = results.some((r) => r.ok && r.latencyMs < 60000)
  return anyHealthy ? "healthy" : "degraded"
}

function selectProvider(results: ProviderResult[]): AIProvider | null {
  const healthy = results.filter((r) => r.ok && r.latencyMs < 60000)
  if (!healthy.length) return null

  // Prefer OpenAI, fall back to Anthropic
  const openai = healthy.find((r) => r.provider === "openai")
  if (openai) return "openai"
  return "anthropic"
}

describe("AI Health Check — fallback logic", () => {
  it("Ambos saudáveis — sistema healthy, usa OpenAI", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: true, latencyMs: 1200 },
      { provider: "anthropic", ok: true, latencyMs: 1800 },
    ]
    expect(computeSystemHealth(results)).toBe("healthy")
    expect(selectProvider(results)).toBe("openai")
  })

  it("OpenAI falha, Anthropic saudável — sistema healthy, usa Anthropic", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: false, latencyMs: 0, error: "timeout" },
      { provider: "anthropic", ok: true, latencyMs: 2000 },
    ]
    expect(computeSystemHealth(results)).toBe("healthy")
    expect(selectProvider(results)).toBe("anthropic")
  })

  it("Anthropic falha, OpenAI saudável — sistema healthy, usa OpenAI", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: true, latencyMs: 800 },
      { provider: "anthropic", ok: false, latencyMs: 0, error: "429 rate limit" },
    ]
    expect(computeSystemHealth(results)).toBe("healthy")
    expect(selectProvider(results)).toBe("openai")
  })

  it("Ambos falham — modo degradado ativado", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: false, latencyMs: 0, error: "connection refused" },
      { provider: "anthropic", ok: false, latencyMs: 0, error: "503 service unavailable" },
    ]
    expect(computeSystemHealth(results)).toBe("degraded")
    expect(selectProvider(results)).toBeNull()
  })

  it("Ambos com latência >60s — modo degradado ativado", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: true, latencyMs: 65000 },
      { provider: "anthropic", ok: true, latencyMs: 70000 },
    ]
    expect(computeSystemHealth(results)).toBe("degraded")
    expect(selectProvider(results)).toBeNull()
  })

  it("OpenAI lento >60s, Anthropic rápido — usa Anthropic", () => {
    const results: ProviderResult[] = [
      { provider: "openai", ok: true, latencyMs: 65000 },
      { provider: "anthropic", ok: true, latencyMs: 1500 },
    ]
    expect(computeSystemHealth(results)).toBe("healthy")
    expect(selectProvider(results)).toBe("anthropic")
  })
})
