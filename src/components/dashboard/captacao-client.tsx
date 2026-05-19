"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Sparkles, Phone, Mail, MapPin, ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type CaptacaoStatus = "novo" | "qualificando" | "pitch_enviado" | "reuniao_agendada" | "captado" | "perdido"
type OptinSource = "contato_existente" | "portal_moova" | "anuncio_publico" | "whatsapp_opt_in"

type CaptacaoLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  property_address: string | null
  property_type: string | null
  estimated_value: number | null
  optin_source: OptinSource
  optin_confirmed: boolean
  status: CaptacaoStatus
  pitch_content: string | null
  pitch_sent_at: string | null
  meeting_at: string | null
  notes: string | null
  created_at: string
}

const STATUS_CONFIG: Record<CaptacaoStatus, { label: string; color: string; bg: string }> = {
  novo: { label: "Novo", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  qualificando: { label: "Qualificando", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  pitch_enviado: { label: "Pitch enviado", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  reuniao_agendada: { label: "Reunião agendada", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  captado: { label: "Captado ✓", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  perdido: { label: "Perdido", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
}

const SOURCE_LABELS: Record<OptinSource, string> = {
  contato_existente: "Contato existente",
  portal_moova: "Moova Portal",
  anuncio_publico: "Anúncio público",
  whatsapp_opt_in: "WhatsApp opt-in",
}

const EMPTY_FORM = {
  name: "", phone: "", email: "", property_address: "",
  property_type: "", estimated_value: "" as string | number,
  optin_source: "contato_existente" as OptinSource, notes: "",
}

const STATUSES: CaptacaoStatus[] = ["novo", "qualificando", "pitch_enviado", "reuniao_agendada", "captado", "perdido"]

export function CaptacaoClient({ initialLeads }: { initialLeads: CaptacaoLead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CaptacaoLead | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generatingPitch, setGeneratingPitch] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(lead: CaptacaoLead) {
    setEditing(lead)
    setForm({
      name: lead.name,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      property_address: lead.property_address ?? "",
      property_type: lead.property_type ?? "",
      estimated_value: lead.estimated_value ?? "",
      optin_source: lead.optin_source,
      notes: lead.notes ?? "",
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Nome obrigatório."); return }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/captacao/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : null }),
        })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setLeads((p) => p.map((l) => l.id === updated.id ? updated : l))
        toast.success("Lead atualizado.")
      } else {
        const res = await fetch("/api/captacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : null }),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setLeads((p) => [created, ...p])
        toast.success("Lead adicionado.")
      }
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    } catch {
      toast.error("Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, status: CaptacaoStatus) {
    const res = await fetch(`/api/captacao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar status."); return }
    const updated = await res.json()
    setLeads((p) => p.map((l) => l.id === updated.id ? updated : l))
  }

  async function handleGeneratePitch(id: string) {
    setGeneratingPitch(id)
    try {
      const res = await fetch(`/api/captacao/${id}/pitch`, { method: "POST" })
      if (!res.ok) throw new Error()
      const { pitch } = await res.json()
      setLeads((p) => p.map((l) => l.id === id ? { ...l, pitch_content: pitch } : l))
      setExpanded(id)
      toast.success("Pitch gerado.")
    } catch {
      toast.error("Erro ao gerar pitch.")
    } finally {
      setGeneratingPitch(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/captacao/${id}`, { method: "DELETE" })
      setLeads((p) => p.filter((l) => l.id !== id))
      toast.success("Lead removido.")
    } catch {
      toast.error("Erro ao remover.")
    } finally {
      setDeletingId(null)
    }
  }

  function copyPitch(pitch: string, id: string) {
    navigator.clipboard.writeText(pitch)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success("Pitch copiado.")
  }

  const active = leads.filter((l) => l.status !== "captado" && l.status !== "perdido")
  const done = leads.filter((l) => l.status === "captado" || l.status === "perdido")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.slice(0, 4).map((s) => (
            <span key={s} className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border", STATUS_CONFIG[s].bg, STATUS_CONFIG[s].color)}>
              {STATUS_CONFIG[s].label}: {leads.filter((l) => l.status === s).length}
            </span>
          ))}
        </div>
        <Button onClick={openNew} className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-2 text-sm">
          <Plus className="w-4 h-4" /> Novo proprietário
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#2D4A3E]/30 rounded-xl p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#2D4A3E]">{editing ? "Editar lead" : "Novo lead opt-in"}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Nome do proprietário *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo" className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Telefone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999" className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">E-mail</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com" className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Origem do contato</label>
              <select value={form.optin_source} onChange={(e) => setForm((f) => ({ ...f, optin_source: e.target.value as OptinSource }))}
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#5A5A5A]">Endereço do imóvel</label>
              <input value={form.property_address} onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                placeholder="Rua, número, bairro" className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Tipo</label>
              <select value={form.property_type} onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value }))}
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20">
                <option value="">Selecionar</option>
                {["apartamento","casa","comercial","terreno","sala"].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5A5A5A]">Valor estimado (R$)</label>
              <input type="number" value={form.estimated_value} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
                placeholder="Ex: 500000" className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#5A5A5A]">Observações</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Contexto do lead, histórico, particularidades..."
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20" />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null) }} className="border-[#E0D8CE]">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="bg-white border border-[#E0D8CE] rounded-xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-[#E0D8CE] mx-auto mb-3" />
          <p className="text-sm text-[#8A8A8A]">Nenhum lead de captação ainda.</p>
          <p className="text-xs text-[#8A8A8A] mt-1">Adicione proprietários que entraram em contato voluntariamente.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expanded === lead.id}
              onToggle={() => setExpanded(expanded === lead.id ? null : lead.id)}
              onEdit={() => openEdit(lead)}
              onDelete={() => handleDelete(lead.id)}
              onStatusChange={(s) => handleStatusChange(lead.id, s)}
              onGeneratePitch={() => handleGeneratePitch(lead.id)}
              onCopyPitch={() => lead.pitch_content && copyPitch(lead.pitch_content, lead.id)}
              generatingPitch={generatingPitch === lead.id}
              copied={copiedId === lead.id}
              deleting={deletingId === lead.id}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Captados / Perdidos</p>
          {done.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expanded === lead.id}
              onToggle={() => setExpanded(expanded === lead.id ? null : lead.id)}
              onEdit={() => openEdit(lead)}
              onDelete={() => handleDelete(lead.id)}
              onStatusChange={(s) => handleStatusChange(lead.id, s)}
              onGeneratePitch={() => handleGeneratePitch(lead.id)}
              onCopyPitch={() => lead.pitch_content && copyPitch(lead.pitch_content, lead.id)}
              generatingPitch={generatingPitch === lead.id}
              copied={copiedId === lead.id}
              deleting={deletingId === lead.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({
  lead, expanded, onToggle, onEdit, onDelete, onStatusChange,
  onGeneratePitch, onCopyPitch, generatingPitch, copied, deleting,
}: {
  lead: CaptacaoLead; expanded: boolean; onToggle: () => void; onEdit: () => void
  onDelete: () => void; onStatusChange: (s: CaptacaoStatus) => void
  onGeneratePitch: () => void; onCopyPitch: () => void
  generatingPitch: boolean; copied: boolean; deleting: boolean
}) {
  const cfg = STATUS_CONFIG[lead.status]
  return (
    <div className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden">
      <button className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-[#FAF7F2] transition-colors" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[#2A2A2A]">{lead.name}</p>
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>{cfg.label}</span>
            <span className="text-[10px] text-[#8A8A8A] bg-[#F5F5F5] px-2 py-0.5 rounded-full">{SOURCE_LABELS[lead.optin_source]}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {lead.property_address && (
              <span className="flex items-center gap-1 text-xs text-[#8A8A8A]">
                <MapPin className="w-3 h-3" />{lead.property_address}
              </span>
            )}
            {lead.estimated_value && (
              <span className="text-xs text-[#2D4A3E] font-medium">
                R$ {Number(lead.estimated_value).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#8A8A8A] shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-[#8A8A8A] shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#E0D8CE] space-y-4 pt-4">
          <div className="flex flex-wrap gap-3 text-xs text-[#8A8A8A]">
            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
            {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
            <span>Adicionado em {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
          </div>

          {lead.notes && (
            <div>
              <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-[#5A5A5A]">{lead.notes}</p>
            </div>
          )}

          {lead.pitch_content && (
            <div className="bg-[#FAF7F2] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#2D4A3E] uppercase tracking-wide">Pitch de exclusividade</p>
                <button onClick={onCopyPitch} className="flex items-center gap-1 text-xs text-[#B87333] hover:underline">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-sm text-[#5A5A5A] whitespace-pre-wrap leading-relaxed">{lead.pitch_content}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8A8A8A] uppercase tracking-wide">Mover para</p>
            <div className="flex flex-wrap gap-1.5">
              {(["novo","qualificando","pitch_enviado","reuniao_agendada","captado","perdido"] as CaptacaoStatus[]).map((s) => (
                <button key={s} onClick={() => onStatusChange(s)}
                  className={cn("text-[10px] px-2.5 py-1 rounded-full border transition-colors font-medium",
                    lead.status === s ? STATUS_CONFIG[s].bg + " " + STATUS_CONFIG[s].color : "border-[#E0D8CE] text-[#8A8A8A] hover:border-[#2D4A3E]"
                  )}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={onGeneratePitch} disabled={generatingPitch}
              variant="outline" className="border-[#B87333] text-[#B87333] hover:bg-[#B87333] hover:text-white gap-1.5 text-xs h-8">
              {generatingPitch ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</> : <><Sparkles className="w-3.5 h-3.5" /> {lead.pitch_content ? "Regerar pitch" : "Gerar pitch"}</>}
            </Button>
            <div className="ml-auto flex gap-1.5">
              <Button variant="ghost" size="icon" onClick={onEdit} className="w-8 h-8 text-[#8A8A8A] hover:text-[#2D4A3E]">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} className="w-8 h-8 text-[#8A8A8A] hover:text-red-600">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
