"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Lead = { id: string; name: string }

type Visit = {
  id: string
  scheduled_at: string
  status: string | null
  notes: string | null
  address: string | null
  leads: { id: string; name: string; phone: string; temperature: string | null } | null
}

type Props = {
  leads: Lead[]
  open: boolean
  onClose: () => void
  onCreated: (visit: Visit) => void
}

export function VisitModal({ leads, open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false)
  const [leadId, setLeadId] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  async function handleSave() {
    if (!leadId || !scheduledAt) return
    setSaving(true)
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          address: address || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) throw new Error("Erro ao criar visita")
      const visit = await res.json()
      toast.success("Visita agendada")
      onCreated(visit)
      onClose()
      setLeadId("")
      setScheduledAt("")
      setAddress("")
      setNotes("")
    } catch {
      toast.error("Erro ao agendar visita")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#30360E]">Nova visita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Lead</Label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full text-sm border border-[#D4C5A0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#30360E] text-[#2A2A2A]"
            >
              <option value="">Selecione um lead...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Data e hora</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border-[#D4C5A0]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Endereço do imóvel</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Rua das Flores, 123 — Pinheiros"
              className="border-[#D4C5A0]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre a visita..."
              rows={2}
              className="border-[#D4C5A0] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#D4C5A0]">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !leadId || !scheduledAt}
            className="bg-[#30360E] hover:bg-[#4A5218] text-white"
          >
            {saving ? "Agendando..." : "Agendar visita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
