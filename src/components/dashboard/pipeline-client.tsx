"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { LeadModal } from "@/components/dashboard/lead-modal"
import type { Lead } from "@/types"
import { cn } from "@/lib/utils"

const STAGES = [
  { key: "novo", label: "Novo" },
  { key: "qualificado", label: "Qualificado" },
  { key: "em_consideracao", label: "Em consideração" },
  { key: "visita_agendada", label: "Visita agendada" },
  { key: "visitou", label: "Visitou" },
  { key: "em_negociacao", label: "Em negociação" },
  { key: "fechou", label: "Fechou" },
]

const TEMPS = [
  { key: "all", label: "Todos" },
  { key: "QUENTE", label: "Quente" },
  { key: "MORNO", label: "Morno" },
  { key: "FRIO", label: "Frio" },
  { key: "INERTE", label: "Inerte" },
]

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

export function PipelineClient({ initialLeads }: { initialLeads: PipelineLead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [tempFilter, setTempFilter] = useState("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = tempFilter === "all" ? leads : leads.filter((l) => l.temperature === tempFilter)

  const grouped = STAGES.reduce<Record<string, PipelineLead[]>>((acc, stage) => {
    acc[stage.key] = filtered.filter((l) => l.status === stage.key)
    return acc
  }, {})

  function handleLeadClick(lead: PipelineLead) {
    setSelectedLead(lead as unknown as Lead)
    setModalOpen(true)
  }

  function handleSaved(updated: Lead) {
    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
    )
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {TEMPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTempFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              tempFilter === key
                ? "bg-[#2D4A3E] text-white"
                : "bg-[#EAE3D9] text-[#5A5A5A] hover:bg-[#E0D8CE]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <KanbanBoard stages={STAGES} grouped={grouped} onLeadClick={handleLeadClick} />

      <LeadModal
        key={selectedLead?.id ?? "new"}
        lead={selectedLead}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
