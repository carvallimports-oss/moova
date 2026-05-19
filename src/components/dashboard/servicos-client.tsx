"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Briefcase, Plus, Loader2, ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ServiceStatus = "pending" | "in_progress" | "completed" | "cancelled"

type ExtraService = {
  id: string
  name: string
  description: string | null
  price: number | null
  client_name: string | null
  client_phone: string | null
  due_date: string | null
  notes: string | null
  status: ServiceStatus
  created_at: string
}

const STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const STATUS_COLORS: Record<ServiceStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
}

const EMPTY: Partial<ExtraService> = {
  name: "",
  description: "",
  price: undefined,
  client_name: "",
  client_phone: "",
  due_date: "",
  notes: "",
  status: "pending",
}

export function ServicosClient({ initialServices }: { initialServices: ExtraService[] }) {
  const [services, setServices] = useState(initialServices)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExtraService | null>(null)
  const [form, setForm] = useState<Partial<ExtraService>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(s: ExtraService) {
    setEditing(s)
    setForm({ ...s, due_date: s.due_date ? s.due_date.slice(0, 10) : "" })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY)
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Informe o nome do serviço."); return }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/extra-services/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        toast.success("Serviço atualizado.")
      } else {
        const res = await fetch("/api/extra-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setServices((prev) => [created, ...prev])
        toast.success("Serviço criado.")
      }
      closeForm()
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, status: ServiceStatus) {
    try {
      const res = await fetch(`/api/extra-services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      toast.error("Erro ao atualizar status.")
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/extra-services/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setServices((prev) => prev.filter((s) => s.id !== id))
      toast.success("Serviço removido.")
    } catch {
      toast.error("Erro ao remover.")
    } finally {
      setDeleting(null)
    }
  }

  const active = services.filter((s) => s.status !== "completed" && s.status !== "cancelled")
  const done = services.filter((s) => s.status === "completed" || s.status === "cancelled")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5A5A5A]">{services.length} serviço{services.length !== 1 ? "s" : ""} registrado{services.length !== 1 ? "s" : ""}</p>
        <Button onClick={openNew} className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-2 text-sm">
          <Plus className="w-4 h-4" /> Novo serviço
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#2D4A3E]/30 rounded-xl p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#2D4A3E]">{editing ? "Editar serviço" : "Novo serviço"}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#5A5A5A]">Nome do serviço *</label>
              <input
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Laudo de avaliação, Vistoria técnica..."
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Cliente</label>
              <input
                value={form.client_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                placeholder="Nome do cliente"
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Telefone do cliente</label>
              <input
                value={form.client_phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Valor (R$)</label>
              <input
                type="number"
                value={form.price ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0,00"
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Prazo</label>
              <input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            {editing && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#5A5A5A]">Status</label>
                <select
                  value={form.status ?? "pending"}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ServiceStatus }))}
                  className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#5A5A5A]">Descrição</label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Descreva o serviço..."
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#5A5A5A]">Observações internas</label>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Notas internas (não visíveis ao cliente)..."
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeForm} className="border-[#E0D8CE]">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {services.length === 0 && (
        <div className="bg-white border border-[#E0D8CE] rounded-xl p-10 text-center">
          <Briefcase className="w-10 h-10 text-[#E0D8CE] mx-auto mb-3" />
          <p className="text-sm text-[#8A8A8A]">Nenhum serviço registrado ainda.</p>
          <p className="text-xs text-[#8A8A8A] mt-1">Clique em "Novo serviço" para começar.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onEdit={() => openEdit(s)}
              onDelete={() => handleDelete(s.id)}
              onStatusChange={(status) => handleStatusChange(s.id, status)}
              deleting={deleting === s.id}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Concluídos / Cancelados</p>
          {done.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onEdit={() => openEdit(s)}
              onDelete={() => handleDelete(s.id)}
              onStatusChange={(status) => handleStatusChange(s.id, status)}
              deleting={deleting === s.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceCard({
  service,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onStatusChange,
  deleting,
}: {
  service: ExtraService
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: ServiceStatus) => void
  deleting: boolean
}) {
  return (
    <div className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAF7F2] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <CheckCircle2 className={cn("w-4 h-4 shrink-0", service.status === "completed" ? "text-green-600" : "text-[#E0D8CE]")} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2A2A2A] truncate">{service.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[service.status])}>
                {STATUS_LABELS[service.status]}
              </span>
              {service.client_name && <span className="text-xs text-[#8A8A8A]">{service.client_name}</span>}
              {service.price && (
                <span className="text-xs text-[#2D4A3E] font-medium">
                  R$ {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#8A8A8A] shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-[#8A8A8A] shrink-0 ml-2" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#E0D8CE] space-y-4 pt-4">
          {service.description && (
            <div>
              <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm text-[#5A5A5A]">{service.description}</p>
            </div>
          )}
          {service.notes && (
            <div>
              <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-[#5A5A5A]">{service.notes}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-[#8A8A8A]">
            {service.due_date && <span>Prazo: {new Date(service.due_date).toLocaleDateString("pt-BR")}</span>}
            {service.client_phone && <span>Tel: {service.client_phone}</span>}
            <span>Criado em {new Date(service.created_at).toLocaleDateString("pt-BR")}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["pending", "in_progress", "completed"] as ServiceStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full border transition-colors font-medium",
                    service.status === s
                      ? STATUS_COLORS[s]
                      : "border-[#E0D8CE] text-[#8A8A8A] hover:border-[#2D4A3E]"
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="w-8 h-8 text-[#8A8A8A] hover:text-[#2D4A3E]"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={deleting}
                className="w-8 h-8 text-[#8A8A8A] hover:text-red-600"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
