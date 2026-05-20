"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead } from "@/types"

type Props = {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onSaved: (lead: Lead) => void
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  em_consideracao: "Em consideração",
  visita_agendada: "Visita agendada",
  visitou: "Visitou",
  em_negociacao: "Em negociação",
  fechou: "Fechou",
  perdido: "Perdido",
}

const TEMP_LABELS: Record<string, string> = {
  QUENTE: "Quente",
  MORNO: "Morno",
  FRIO: "Frio",
  INERTE: "Inerte",
}

export function LeadModal({ lead, open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [isVip, setIsVip] = useState(lead?.is_vip ?? false)
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    status: lead?.status ?? "novo",
    temperature: lead?.temperature ?? "FRIO",
    estimated_budget: lead?.estimated_budget?.toString() ?? "",
    region: lead?.region ?? "",
    next_action: lead?.next_action ?? "",
    notes: lead?.notes ?? "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        status: form.status,
        temperature: form.temperature,
        region: form.region || undefined,
        next_action: form.next_action || undefined,
        notes: form.notes || undefined,
        is_vip: isVip,
      }
      if (form.estimated_budget) body.estimated_budget = parseFloat(form.estimated_budget)

      const url = lead ? `/api/leads/${lead.id}` : "/api/leads"
      const method = lead ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erro ao salvar lead")
      const saved = await res.json()
      toast.success(lead ? "Lead atualizado" : "Lead criado")
      onSaved(saved)
      onClose()
    } catch (err) {
      toast.error("Erro ao salvar lead")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#30360E]">
            {lead ? "Editar lead" : "Novo lead"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="Nome do lead" className="border-[#D4C5A0]" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (WhatsApp)</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="5511999999999" className="border-[#D4C5A0]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => v && set("status", v)}>
                <SelectTrigger className="border-[#D4C5A0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select value={form.temperature} onValueChange={(v) => v && set("temperature", v)}>
                <SelectTrigger className="border-[#D4C5A0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMP_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Budget estimado (R$)</Label>
              <Input value={form.estimated_budget} onChange={(e) => set("estimated_budget", e.target.value)}
                type="number" placeholder="500000" className="border-[#D4C5A0]" />
            </div>
            <div className="space-y-1.5">
              <Label>Região de interesse</Label>
              <Input value={form.region} onChange={(e) => set("region", e.target.value)}
                placeholder="Pinheiros, SP" className="border-[#D4C5A0]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Próxima ação</Label>
            <Input value={form.next_action} onChange={(e) => set("next_action", e.target.value)}
              placeholder="Ex: Ligar para confirmar visita" className="border-[#D4C5A0]" />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Notas internas sobre o lead..." rows={3}
              className="border-[#D4C5A0] resize-none" />
          </div>

          {/* VIP toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-[#D4C5A0] bg-[#F5F0E0]">
            <div>
              <p className="text-sm font-medium text-[#2A2A2A]">Lead VIP</p>
              <p className="text-xs text-[#7A7A6A]">A Nara prioriza respostas e aprovações humanas para VIPs</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVip((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isVip ? "bg-[#787F56]" : "bg-[#D4C5A0]"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isVip ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#D4C5A0]">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.phone}
            className="bg-[#30360E] hover:bg-[#4A5218] text-white">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
