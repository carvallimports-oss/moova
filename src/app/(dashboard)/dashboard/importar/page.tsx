"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ParsedLead = {
  name: string
  phone: string
  estimated_budget?: number
  region?: string
  notes?: string
  _status: "pending" | "importing" | "done" | "error"
  _error?: string
}

function parseCSV(text: string): ParsedLead[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })

    return {
      name: row.nome ?? row.name ?? row.cliente ?? "",
      phone: (row.telefone ?? row.phone ?? row.whatsapp ?? "").replace(/\D/g, ""),
      estimated_budget: row.budget ? parseFloat(row.budget.replace(/[^\d.]/g, "")) : undefined,
      region: row.regiao ?? row.region ?? row.bairro ?? undefined,
      notes: row.observacoes ?? row.notes ?? row.notas ?? undefined,
      _status: "pending" as const,
    }
  }).filter((l) => l.name && l.phone)
}

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [leads, setLeads] = useState<ParsedLead[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setLeads(parseCSV(text))
      setDone(false)
    }
    reader.readAsText(file, "UTF-8")
  }

  async function handleImport() {
    setImporting(true)
    setLeads((prev) => prev.map((l) => ({ ...l, _status: "importing" as const })))

    try {
      const body = {
        leads: leads.map((l) => ({
          name: l.name,
          phone: l.phone,
          estimated_budget: l.estimated_budget,
          region: l.region,
          notes: l.notes,
        })),
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setLeads((prev) => prev.map((l) => ({ ...l, _status: "done" as const })))
      } else {
        const err = await res.json().catch(() => ({}))
        setLeads((prev) => prev.map((l) => ({ ...l, _status: "error" as const, _error: err?.error ?? `HTTP ${res.status}` })))
      }
    } catch (err) {
      setLeads((prev) => prev.map((l) => ({ ...l, _status: "error" as const, _error: String(err) })))
    }

    setImporting(false)
    setDone(true)
  }

  const counts = leads.reduce(
    (acc, l) => { acc[l._status]++; return acc },
    { pending: 0, importing: 0, done: 0, error: 0 }
  )

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Importar leads</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">
          Importe sua base de leads via CSV. Colunas reconhecidas: <code className="bg-[#F5F0E8] px-1 rounded">nome</code>, <code className="bg-[#F5F0E8] px-1 rounded">telefone</code>, <code className="bg-[#F5F0E8] px-1 rounded">budget</code>, <code className="bg-[#F5F0E8] px-1 rounded">regiao</code>, <code className="bg-[#F5F0E8] px-1 rounded">observacoes</code>
        </p>
      </div>

      <Card className="border-[#E0D8CE]">
        <CardContent className="p-6 space-y-4">
          {leads.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#E0D8CE] rounded-lg p-12 text-center cursor-pointer hover:border-[#B87333] transition-colors"
            >
              <p className="text-[#8A8A8A] text-sm">Clique para selecionar um arquivo CSV</p>
              <p className="text-[#B0A898] text-xs mt-1">Codificação UTF-8 recomendada</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-[#2D4A3E] font-medium">{leads.length} leads</span>
                  {counts.done > 0 && <span className="text-green-600">{counts.done} importados</span>}
                  {counts.error > 0 && <span className="text-red-600">{counts.error} com erro</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setLeads([]); setDone(false) }}
                  className="text-[#8A8A8A] text-xs">
                  Trocar arquivo
                </Button>
              </div>

              {leads.length < 100 && !done && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                  <strong>Atenção:</strong> o critério de acesso à Moova requer no mínimo 100 contatos válidos.
                  Seu arquivo tem {leads.length} lead{leads.length !== 1 ? "s" : ""} — adicione mais contatos ao CSV para atingir o mínimo.
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1">
                {leads.map((lead, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-[#FAF7F2] text-sm">
                    <span className="w-4 text-center">
                      {lead._status === "done" && "✓"}
                      {lead._status === "error" && "✗"}
                      {lead._status === "importing" && "⋯"}
                      {lead._status === "pending" && "·"}
                    </span>
                    <span className="font-medium text-[#2D4A3E] flex-1">{lead.name}</span>
                    <span className="text-[#8A8A8A]">{lead.phone}</span>
                    {lead.region && <span className="text-[#B0A898] text-xs">{lead.region}</span>}
                    {lead._error && <span className="text-red-500 text-xs">{lead._error}</span>}
                  </div>
                ))}
              </div>

              {!done && (
                <Button onClick={handleImport} disabled={importing}
                  className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                  {importing ? `Importando... (${counts.done}/${leads.length})` : `Importar ${leads.length} leads`}
                </Button>
              )}

              {done && (
                <p className="text-center text-sm text-green-700 font-medium py-2">
                  Importação concluída — {counts.done} leads adicionados{counts.error > 0 ? `, ${counts.error} com erro` : ""}
                </p>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </CardContent>
      </Card>
    </div>
  )
}
