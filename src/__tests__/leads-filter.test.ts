import { describe, it, expect } from "vitest"

type TableLead = {
  id: string
  name: string
  phone: string
  status: string
  temperature: string | null
  estimated_budget: number | null
  region: string | null
  last_contact_at: string | null
  next_action: string | null
  created_at: string
}

type SortKey = "name" | "status" | "temperature" | "estimated_budget" | "created_at"

function filterLeads(
  leads: TableLead[],
  statusFilter: string,
  tempFilter: string,
  search: string
): TableLead[] {
  let list = leads
  if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter)
  if (tempFilter !== "all") list = list.filter((l) => l.temperature === tempFilter)
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q))
  }
  return list
}

function sortLeads(leads: TableLead[], key: SortKey, asc: boolean): TableLead[] {
  return [...leads].sort((a, b) => {
    let av: string | number = a[key] ?? ""
    let bv: string | number = b[key] ?? ""
    if (key === "estimated_budget") {
      av = Number(av)
      bv = Number(bv)
    }
    if (av < bv) return asc ? -1 : 1
    if (av > bv) return asc ? 1 : -1
    return 0
  })
}

const LEADS: TableLead[] = [
  { id: "1", name: "Ana Silva", phone: "5511999991111", status: "novo", temperature: "QUENTE", estimated_budget: 800000, region: "SP", last_contact_at: null, next_action: null, created_at: "2026-01-01T00:00:00Z" },
  { id: "2", name: "Bruno Costa", phone: "5511999992222", status: "qualificado", temperature: "MORNO", estimated_budget: 500000, region: "RJ", last_contact_at: null, next_action: null, created_at: "2026-01-02T00:00:00Z" },
  { id: "3", name: "Carla Mendes", phone: "5521999993333", status: "novo", temperature: "FRIO", estimated_budget: 300000, region: "RJ", last_contact_at: null, next_action: null, created_at: "2026-01-03T00:00:00Z" },
  { id: "4", name: "Diego Rocha", phone: "5511999994444", status: "fechou", temperature: "QUENTE", estimated_budget: 1200000, region: "SP", last_contact_at: null, next_action: null, created_at: "2026-01-04T00:00:00Z" },
  { id: "5", name: "Eva Lima", phone: "5531999995555", status: "perdido", temperature: null, estimated_budget: null, region: null, last_contact_at: null, next_action: null, created_at: "2026-01-05T00:00:00Z" },
]

describe("filterLeads — status", () => {
  it("all retorna todos", () => {
    expect(filterLeads(LEADS, "all", "all", "")).toHaveLength(5)
  })

  it("filtra por status novo", () => {
    const r = filterLeads(LEADS, "novo", "all", "")
    expect(r).toHaveLength(2)
    expect(r.every((l) => l.status === "novo")).toBe(true)
  })

  it("filtra por status fechou", () => {
    const r = filterLeads(LEADS, "fechou", "all", "")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Diego Rocha")
  })

  it("status sem resultado retorna vazio", () => {
    expect(filterLeads(LEADS, "em_negociacao", "all", "")).toHaveLength(0)
  })
})

describe("filterLeads — temperatura", () => {
  it("filtra QUENTE", () => {
    const r = filterLeads(LEADS, "all", "QUENTE", "")
    expect(r).toHaveLength(2)
    expect(r.every((l) => l.temperature === "QUENTE")).toBe(true)
  })

  it("filtra FRIO", () => {
    const r = filterLeads(LEADS, "all", "FRIO", "")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Carla Mendes")
  })

  it("temperatura null não aparece em filtro QUENTE", () => {
    const r = filterLeads(LEADS, "all", "QUENTE", "")
    expect(r.some((l) => l.temperature === null)).toBe(false)
  })

  it("combina status e temperatura", () => {
    const r = filterLeads(LEADS, "novo", "QUENTE", "")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Ana Silva")
  })
})

describe("filterLeads — busca", () => {
  it("busca por nome case-insensitive", () => {
    expect(filterLeads(LEADS, "all", "all", "ana")).toHaveLength(1)
    expect(filterLeads(LEADS, "all", "all", "ANA")).toHaveLength(1)
    expect(filterLeads(LEADS, "all", "all", "silva")).toHaveLength(1)
  })

  it("busca por telefone", () => {
    const r = filterLeads(LEADS, "all", "all", "5521")
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe("Carla Mendes")
  })

  it("busca sem resultado retorna vazio", () => {
    expect(filterLeads(LEADS, "all", "all", "zzz")).toHaveLength(0)
  })

  it("busca combina com filtro de status", () => {
    const r = filterLeads(LEADS, "novo", "all", "silva")
    expect(r).toHaveLength(1)
  })
})

describe("sortLeads", () => {
  it("ordena por nome ASC", () => {
    const r = sortLeads(LEADS, "name", true)
    expect(r[0].name).toBe("Ana Silva")
    expect(r[4].name).toBe("Eva Lima")
  })

  it("ordena por nome DESC", () => {
    const r = sortLeads(LEADS, "name", false)
    expect(r[0].name).toBe("Eva Lima")
    expect(r[4].name).toBe("Ana Silva")
  })

  it("ordena por budget ASC — null vai para o início", () => {
    const r = sortLeads(LEADS, "estimated_budget", true)
    expect(r[r.length - 1].estimated_budget).toBe(1200000)
  })

  it("ordena por budget DESC — maior primeiro", () => {
    const r = sortLeads(LEADS, "estimated_budget", false)
    expect(r[0].estimated_budget).toBe(1200000)
  })

  it("ordena por created_at DESC — mais recente primeiro", () => {
    const r = sortLeads(LEADS, "created_at", false)
    expect(r[0].id).toBe("5")
  })

  it("não muta o array original", () => {
    const original = [...LEADS]
    sortLeads(LEADS, "name", true)
    expect(LEADS[0].name).toBe(original[0].name)
  })
})
