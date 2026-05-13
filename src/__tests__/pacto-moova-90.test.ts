import { describe, it, expect } from "vitest"
import type { PactoScenario } from "@/types"

// Pure business logic — no DB, no network

type PactoInput = {
  metaAtingida: boolean
  goodFaithScore: number // 0–100
  subscriptionValue: number
}

function calcPactoScenario(input: PactoInput): {
  scenario: PactoScenario
  refundAmount: number
  extraMonths: number
} {
  const { metaAtingida, goodFaithScore, subscriptionValue } = input

  if (metaAtingida) {
    return { scenario: "A", refundAmount: 0, extraMonths: 0 }
  }

  if (goodFaithScore >= 100) {
    return { scenario: "B", refundAmount: subscriptionValue * 0.7, extraMonths: 0 }
  }

  if (goodFaithScore >= 50) {
    return { scenario: "C", refundAmount: subscriptionValue * 0.35, extraMonths: 1 }
  }

  return { scenario: "D", refundAmount: 0, extraMonths: 0 }
}

describe("Pacto Moova 90", () => {
  const sub = 2397 // R$799/mês × 3 meses

  it("Cenário A — meta atingida, sem devolução", () => {
    const result = calcPactoScenario({ metaAtingida: true, goodFaithScore: 60, subscriptionValue: sub })
    expect(result.scenario).toBe("A")
    expect(result.refundAmount).toBe(0)
    expect(result.extraMonths).toBe(0)
  })

  it("Cenário B — boa-fé 100%, devolve 70%", () => {
    const result = calcPactoScenario({ metaAtingida: false, goodFaithScore: 100, subscriptionValue: sub })
    expect(result.scenario).toBe("B")
    expect(result.refundAmount).toBeCloseTo(sub * 0.7)
    expect(result.extraMonths).toBe(0)
  })

  it("Cenário C — boa-fé 50–80%, devolve 35% + 1 mês", () => {
    const result = calcPactoScenario({ metaAtingida: false, goodFaithScore: 65, subscriptionValue: sub })
    expect(result.scenario).toBe("C")
    expect(result.refundAmount).toBeCloseTo(sub * 0.35)
    expect(result.extraMonths).toBe(1)
  })

  it("Cenário C — limite inferior: goodFaith=50 ainda é C", () => {
    const result = calcPactoScenario({ metaAtingida: false, goodFaithScore: 50, subscriptionValue: sub })
    expect(result.scenario).toBe("C")
  })

  it("Cenário D — sabotou, garantia anulada", () => {
    const result = calcPactoScenario({ metaAtingida: false, goodFaithScore: 30, subscriptionValue: sub })
    expect(result.scenario).toBe("D")
    expect(result.refundAmount).toBe(0)
  })

  it("Cenário D — limite: goodFaith=49 é D, não C", () => {
    const result = calcPactoScenario({ metaAtingida: false, goodFaithScore: 49, subscriptionValue: sub })
    expect(result.scenario).toBe("D")
  })

  it("Meta atingida sempre é A, independente de goodFaithScore", () => {
    const result = calcPactoScenario({ metaAtingida: true, goodFaithScore: 0, subscriptionValue: sub })
    expect(result.scenario).toBe("A")
  })
})
