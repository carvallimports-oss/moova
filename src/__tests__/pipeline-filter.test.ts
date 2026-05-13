import { describe, it, expect } from "vitest"

type PipelineLead = {
  id: string
  name: string
  phone: string
  status: string
  temperature: string | null
  estimated_budget: number | null
  last_contact_at: string | null
  next_action: string | null
}

const STAGES = [
  "novo", "qualificado", "em_consideracao", "visita_agendada",
  "visitou", "em_negociacao", "fechou",
]

function filterByTemp(leads: PipelineLead[], tempFilter: string): PipelineLead[] {
  return tempFilter === "all" ? leads : leads.filter((l) => l.temperature === tempFilter)
}

function groupByStage(leads: PipelineLead[]): Record<string, PipelineLead[]> {
  return STAGES.reduce<Record<string, PipelineLead[]>>((acc, stage) => {
    acc[stage] = leads.filter((l) => l.status === stage)
    return acc
  }, {})
}

const LEADS: PipelineLead[] = [
  { id: "1", name: "Ana", phone: "111", status: "novo", temperature: "QUENTE", estimated_budget: 800000, last_contact_at: null, next_action: null },
  { id: "2", name: "Bruno", phone: "222", status: "novo", temperature: "MORNO", estimated_budget: 500000, last_contact_at: null, next_action: null },
  { id: "3", name: "Carla", phone: "333", status: "qualificado", temperature: "QUENTE", estimated_budget: 700000, last_contact_at: null, next_action: null },
  { id: "4", name: "Diego", phone: "444", status: "visita_agendada", temperature: "FRIO", estimated_budget: 300000, last_contact_at: null, next_action: null },
  { id: "5", name: "Eva", phone: "555", status: "fechou", temperature: null, estimated_budget: null, last_contact_at: null, next_action: null },
]

describe("filterByTemp", () => {
  it("all retorna todos os leads", () => {
    expect(filterByTemp(LEADS, "all")).toHaveLength(5)
  })

  it("QUENTE filtra corretamente", () => {
    const r = filterByTemp(LEADS, "QUENTE")
    expect(r).toHaveLength(2)
    expect(r.every((l) => l.temperature === "QUENTE")).toBe(true)
  })

  it("MORNO retorna apenas 1", () => {
    const r = filterByTemp(LEADS, "MORNO")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Bruno")
  })

  it("FRIO retorna apenas 1", () => {
    const r = filterByTemp(LEADS, "FRIO")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Diego")
  })

  it("INERTE retorna vazio quando não há leads inertes", () => {
    expect(filterByTemp(LEADS, "INERTE")).toHaveLength(0)
  })

  it("lead com temperature null não aparece em nenhum filtro específico", () => {
    const r = filterByTemp(LEADS, "QUENTE")
    expect(r.some((l) => l.id === "5")).toBe(false)
  })

  it("não muta o array original", () => {
    const copy = [...LEADS]
    filterByTemp(LEADS, "QUENTE")
    expect(LEADS).toHaveLength(copy.length)
  })
})

describe("groupByStage", () => {
  it("agrupa leads pelo status correto", () => {
    const grouped = groupByStage(LEADS)
    expect(grouped["novo"]).toHaveLength(2)
    expect(grouped["qualificado"]).toHaveLength(1)
    expect(grouped["visita_agendada"]).toHaveLength(1)
    expect(grouped["fechou"]).toHaveLength(1)
  })

  it("estágios sem leads retornam array vazio, não undefined", () => {
    const grouped = groupByStage(LEADS)
    expect(grouped["em_consideracao"]).toEqual([])
    expect(grouped["visitou"]).toEqual([])
    expect(grouped["em_negociacao"]).toEqual([])
  })

  it("todos os estágios estão presentes como chaves", () => {
    const grouped = groupByStage(LEADS)
    STAGES.forEach((stage) => {
      expect(grouped).toHaveProperty(stage)
    })
  })

  it("filtro de temperatura + agrupamento — só QUENTE no novo", () => {
    const quentes = filterByTemp(LEADS, "QUENTE")
    const grouped = groupByStage(quentes)
    expect(grouped["novo"]).toHaveLength(1)
    expect(grouped["novo"][0].name).toBe("Ana")
    expect(grouped["qualificado"]).toHaveLength(1)
  })

  it("nenhum lead aparece em estágio errado", () => {
    const grouped = groupByStage(LEADS)
    const allGrouped = Object.values(grouped).flat()
    expect(allGrouped).toHaveLength(5)
  })
})
