"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DollarSign, Phone } from "lucide-react"

type Lead = {
  id: string
  name: string
  phone: string
  status: string
  temperature: string | null
  estimated_budget: number | null
  last_contact_at: string | null
  next_action: string | null
}

type Stage = { key: string; label: string }

const tempColor: Record<string, string> = {
  QUENTE: "bg-red-50 text-red-700 border-red-200",
  MORNO: "bg-orange-50 text-orange-700 border-orange-200",
  FRIO: "bg-blue-50 text-blue-700 border-blue-200",
  INERTE: "bg-gray-50 text-gray-500 border-gray-200",
}

function LeadCard({
  lead,
  onClick,
  onDragStart,
}: {
  lead: Lead
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="border-[#E0D8CE] hover:shadow-sm transition-shadow cursor-pointer active:opacity-70 select-none"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm text-[#2A2A2A] leading-tight">{lead.name}</p>
          {lead.temperature && (
            <Badge className={cn("text-[10px] border px-1.5 py-0 shrink-0", tempColor[lead.temperature])}>
              {lead.temperature}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
          <Phone className="w-3 h-3" />
          {lead.phone}
        </div>
        {lead.estimated_budget && (
          <div className="flex items-center gap-1.5 text-xs text-[#B87333] font-medium">
            <DollarSign className="w-3 h-3" />
            R$ {lead.estimated_budget.toLocaleString("pt-BR")}
          </div>
        )}
        {lead.next_action && (
          <p className="text-[11px] text-[#5A5A5A] bg-[#EAE3D9] px-2 py-1 rounded">
            {lead.next_action}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function KanbanBoard({
  stages,
  grouped,
  onLeadClick,
  onDrop,
}: {
  stages: Stage[]
  grouped: Record<string, Lead[] | null>
  onLeadClick?: (lead: Lead) => void
  onDrop?: (lead: Lead, toStage: string) => void
}) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [dragging, setDragging] = useState<Lead | null>(null)

  function handleDragStart(e: React.DragEvent, lead: Lead) {
    setDragging(lead)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverStage(stageKey)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the column entirely (not entering a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverStage(null)
    }
  }

  function handleDrop(e: React.DragEvent, toStage: string) {
    e.preventDefault()
    setDragOverStage(null)
    if (dragging && dragging.status !== toStage) {
      onDrop?.(dragging, toStage)
    }
    setDragging(null)
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOverStage(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
      {stages.map((stage) => {
        const leads = grouped[stage.key] ?? []
        const isOver = dragOverStage === stage.key
        return (
          <div
            key={stage.key}
            className="flex flex-col w-60 shrink-0"
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-[#5A5A5A] uppercase tracking-wide">
                {stage.label}
              </span>
              <span className="text-xs text-[#8A8A8A] bg-[#EAE3D9] px-1.5 py-0.5 rounded-full">
                {leads.length}
              </span>
            </div>
            <div
              className={cn(
                "flex flex-col gap-2 flex-1 min-h-[200px] rounded-xl p-2 transition-colors",
                isOver ? "bg-[#2D4A3E]/10 ring-2 ring-dashed ring-[#2D4A3E]/30" : "bg-[#EAE3D9]/40"
              )}
            >
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick?.(lead)}
                  onDragStart={(e) => handleDragStart(e, lead)}
                />
              ))}
              {leads.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-[#8A8A8A]/50">{isOver ? "Soltar aqui" : "Vazio"}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
      {/* Invisible drag-end catcher */}
      <div onDragEnd={handleDragEnd} className="hidden" />
    </div>
  )
}
