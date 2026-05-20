"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Calendar, Clock, MapPin, User, Check, X, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VisitModal } from "@/components/dashboard/visit-modal"

type Lead = { id: string; name: string; phone: string; temperature: string | null } | null

type Visit = {
  id: string
  scheduled_at: string
  status: string | null
  notes: string | null
  address: string | null
  leads: Lead
}

function statusColor(status: string) {
  if (status === "confirmada") return "bg-green-50 text-green-700 border-green-200"
  if (status === "cancelada") return "bg-red-50 text-red-700 border-red-200"
  if (status === "realizada") return "bg-blue-50 text-blue-700 border-blue-200"
  return "bg-orange-50 text-orange-700 border-orange-200"
}

async function patchVisit(id: string, status: string) {
  const res = await fetch(`/api/visits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error("Erro ao atualizar visita")
  return res.json()
}

function VisitCard({ visit, onUpdate }: { visit: Visit; onUpdate: (id: string, status: string) => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const lead = visit.leads
  const dt = new Date(visit.scheduled_at)
  const status = visit.status ?? "pendente"
  const isPast = dt < new Date() || status === "cancelada" || status === "realizada"

  async function handle(newStatus: string) {
    setLoading(newStatus)
    try {
      await patchVisit(visit.id, newStatus)
      onUpdate(visit.id, newStatus)
      const msgs: Record<string, string> = {
        confirmada: "Visita confirmada",
        cancelada: "Visita cancelada",
        realizada: "Visita marcada como realizada",
      }
      toast.success(msgs[newStatus] ?? "Visita atualizada")
    } catch {
      toast.error("Erro ao atualizar visita")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className={cn("border-[#D4C5A0]", isPast && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#30360E]" />
              <span className="font-medium text-[#2A2A2A]">{lead?.name ?? "Lead"}</span>
              {lead?.temperature && (
                <span className="text-[10px] text-[#7A7A6A]">· {lead.temperature}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[#4A4A3A]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {visit.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {visit.address}
                </span>
              )}
            </div>
            {visit.notes && (
              <p className="text-xs text-[#7A7A6A] bg-[#EDE5CD] px-3 py-1.5 rounded-lg">
                {visit.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-[11px] border ${statusColor(status)}`}>
              {status}
            </Badge>
            {status === "pendente" && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => handle("confirmada")}
                  disabled={!!loading}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  {loading === "confirmada" ? "..." : "Confirmar"}
                </button>
                <button
                  onClick={() => handle("cancelada")}
                  disabled={!!loading}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  {loading === "cancelada" ? "..." : "Cancelar"}
                </button>
              </div>
            )}
            {status === "confirmada" && (
              <button
                onClick={() => handle("realizada")}
                disabled={!!loading}
                className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                {loading === "realizada" ? "..." : "Realizada"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VisitasClient({
  initialVisits,
  availableLeads,
}: {
  initialVisits: Visit[]
  availableLeads: { id: string; name: string }[]
}) {
  const [visits, setVisits] = useState(initialVisits)
  const [modalOpen, setModalOpen] = useState(false)

  function handleUpdate(id: string, status: string) {
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)))
  }

  function handleCreated(visit: Visit) {
    setVisits((prev) => [...prev, visit].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    ))
  }

  const now = new Date()
  const upcoming = visits.filter((v) => new Date(v.scheduled_at) >= now && v.status !== "cancelada" && v.status !== "realizada")
  const past = visits.filter((v) => new Date(v.scheduled_at) < now || v.status === "cancelada" || v.status === "realizada")

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#30360E] hover:bg-[#4A5218] text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova visita
        </Button>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-16 text-[#7A7A6A]">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma visita agendada ainda.</p>
          <p className="text-xs mt-1">A Nara agenda visitas automaticamente ao qualificar leads quentes.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-[#7A7A6A] uppercase tracking-widest">Próximas</h2>
              {upcoming.map((v) => (
                <VisitCard key={v.id} visit={v} onUpdate={handleUpdate} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-[#7A7A6A] uppercase tracking-widest">Histórico</h2>
              {past.map((v) => (
                <VisitCard key={v.id} visit={v} onUpdate={handleUpdate} />
              ))}
            </section>
          )}
        </div>
      )}

      <VisitModal
        leads={availableLeads}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
