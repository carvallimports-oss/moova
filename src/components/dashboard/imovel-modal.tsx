"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Property = {
  id: string
  title: string
  description?: string
  price?: number
  address?: string
  city?: string
  state?: string
  type?: string
  bedrooms?: number
  area_sqm?: number
  active: boolean
}

type Props = {
  property?: Property | null
  open: boolean
  onClose: () => void
  onSaved: (property: Property) => void
}

const PROPERTY_TYPES = ["Apartamento", "Casa", "Cobertura", "Terreno", "Sala comercial", "Galpão", "Studio"]
const BR_STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

export function ImovelModal({ property, open, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: property?.title ?? "",
    description: property?.description ?? "",
    price: property?.price?.toString() ?? "",
    address: property?.address ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "SP",
    type: property?.type ?? "Apartamento",
    bedrooms: property?.bedrooms?.toString() ?? "",
    area_sqm: property?.area_sqm?.toString() ?? "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        type: form.type,
        state: form.state,
      }
      if (form.description) body.description = form.description
      if (form.price) body.price = parseFloat(form.price)
      if (form.address) body.address = form.address
      if (form.city) body.city = form.city
      if (form.bedrooms) body.bedrooms = parseInt(form.bedrooms)
      if (form.area_sqm) body.area_sqm = parseFloat(form.area_sqm)

      const url = property ? `/api/properties/${property.id}` : "/api/properties"
      const method = property ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erro ao salvar imóvel")
      const saved = await res.json()
      toast.success(property ? "Imóvel atualizado" : "Imóvel cadastrado")
      onSaved(saved)
      onClose()
    } catch {
      toast.error("Erro ao salvar imóvel")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#2D4A3E]">
            {property ? "Editar imóvel" : "Cadastrar imóvel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título do anúncio</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Apartamento 3 dorms com suíte em Pinheiros" className="border-[#E0D8CE]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => v && set("type", v)}>
                <SelectTrigger className="border-[#E0D8CE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input value={form.price} onChange={(e) => set("price", e.target.value)}
                type="number" placeholder="850000" className="border-[#E0D8CE]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quartos</Label>
              <Input value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)}
                type="number" placeholder="3" className="border-[#E0D8CE]" />
            </div>
            <div className="space-y-1.5">
              <Label>Área (m²)</Label>
              <Input value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)}
                type="number" placeholder="92" className="border-[#E0D8CE]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="Rua Augusta, 1200" className="border-[#E0D8CE]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)}
                placeholder="São Paulo" className="border-[#E0D8CE]" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.state} onValueChange={(v) => v && set("state", v)}>
                <SelectTrigger className="border-[#E0D8CE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Descreva o imóvel para a Cora usar nas conversas..." rows={3}
              className="border-[#E0D8CE] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#E0D8CE]">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.title}
            className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
