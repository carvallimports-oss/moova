import { describe, it, expect } from "vitest"

// Test that diagnostico marcos are idempotent — sending the same marco twice is a no-op

type Marco = {
  day_number: number
  sent_at: string | null
  diagnostico_id: string
  user_id: string
}

function shouldSendMarco(marco: Marco, now: Date, diagnosticoStartedAt: Date): boolean {
  if (marco.sent_at !== null) return false // Already sent — idempotent

  const daysSinceStart = Math.floor(
    (now.getTime() - diagnosticoStartedAt.getTime()) / 86400000
  )

  return daysSinceStart >= marco.day_number
}

describe("Diagnóstico marcos — idempotência", () => {
  const diagStart = new Date("2026-01-01T10:00:00Z")
  const base: Omit<Marco, "day_number" | "sent_at"> = {
    diagnostico_id: "diag-1",
    user_id: "user-1",
  }

  it("Marco não enviado e prazo chegou — deve enviar", () => {
    const marco: Marco = { ...base, day_number: 3, sent_at: null }
    const now = new Date("2026-01-04T10:00:00Z") // day 3
    expect(shouldSendMarco(marco, now, diagStart)).toBe(true)
  })

  it("Marco já enviado — não deve reenviar (idempotente)", () => {
    const marco: Marco = { ...base, day_number: 3, sent_at: "2026-01-04T10:00:00Z" }
    const now = new Date("2026-01-04T12:00:00Z")
    expect(shouldSendMarco(marco, now, diagStart)).toBe(false)
  })

  it("Prazo ainda não chegou — não deve enviar", () => {
    const marco: Marco = { ...base, day_number: 7, sent_at: null }
    const now = new Date("2026-01-04T10:00:00Z") // day 3 — before day 7
    expect(shouldSendMarco(marco, now, diagStart)).toBe(false)
  })

  it("Marco do dia 14 só envia no dia 14 ou depois", () => {
    const marco: Marco = { ...base, day_number: 14, sent_at: null }
    const day13 = new Date("2026-01-14T10:00:00Z")
    const day14 = new Date("2026-01-15T10:00:00Z")
    expect(shouldSendMarco(marco, day13, diagStart)).toBe(false)
    expect(shouldSendMarco(marco, day14, diagStart)).toBe(true)
  })

  it("Exatamente no dia correto — deve enviar", () => {
    const marco: Marco = { ...base, day_number: 3, sent_at: null }
    const exactDay3 = new Date("2026-01-04T10:00:00Z")
    expect(shouldSendMarco(marco, exactDay3, diagStart)).toBe(true)
  })

  it("Cron atrasado — marco do dia 3 chegando no dia 5 ainda envia", () => {
    const marco: Marco = { ...base, day_number: 3, sent_at: null }
    const day5 = new Date("2026-01-06T10:00:00Z")
    expect(shouldSendMarco(marco, day5, diagStart)).toBe(true)
  })
})
