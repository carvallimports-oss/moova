"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus, Phone, Mail, Star, Rss, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { LandlordProfile, LandlordStatus } from "@/types"

type Column = { status: string; label: string }

type LandlordCard = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  status: string
  exclusivity: boolean
  next_action?: string | null
  next_action_at?: string | null
  diario_optin: boolean
  origin?: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  prospeccao: "bg-[#EAE3D9] text-[#8A8A8A]",
  em_contato: "bg-blue-50 text-blue-600",
  negociando_exclusividade: "bg-yellow-50 text-yellow-700",
  captado: "bg-green-50 text-green-700",
  em_publicacao: "bg-purple-50 text-purple-700",
  vendido: "bg-[#2D4A3E]/10 text-[#2D4A3E]",
  retomado: "bg-red-50 text-red-600",
}

function LandlordModal({
  landlord,
  onClose,
  onSaved,
}: {
  landlord: LandlordCard | null
  onClose: () => void
  onSaved: (l: LandlordCard) => void
}) {
  const [form, setForm] = useState<Partial<LandlordCard>>(landlord ?? {})
  const [saving, setSaving] = useState(false)
  const isNew = !landlord

  async function handleSave() {
    setSaving(true)
    try {
      const method = isNew ? "POST" : "PATCH"
      const url = isNew ? "/api/landlords" : `/api/landlords/${landlord!.id}`
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          status: form.status ?? "prospeccao",
          exclusivity: form.exclusivity ?? false,
          next_action: form.next_action,
          diario_optin: form.diario_optin ?? false,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onSaved(data)
      onClose()
      toast.success(isNew ? "Proprietário adicionado." : "Proprietário atualizado.")
    } catch {
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0D8CE]">
          <h2 className="font-serif text-lg text-[#2D4A3E]">
            {isNew ? "Novo proprietário" : "Editar proprietário"}
          </h2>
          <button onClick={onClose} className="text-[#8A8A8A] hover:text-[#2A2A2A]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-[#5A5A5A] mb-1 block">Nome *</label>
            <input
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome do proprietário"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#5A5A5A] mb-1 block">Telefone</label>
              <input
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5A5A5A] mb-1 block">Email</label>
              <input
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#5A5A5A] mb-1 block">Status</label>
            <select
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              value={form.status ?? "prospeccao"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="prospeccao">Prospecção</option>
              <option value="em_contato">Em contato</option>
              <option value="negociando_exclusividade">Negociando exclusividade</option>
              <option value="captado">Captado</option>
              <option value="em_publicacao">Em publicação</option>
              <option value="vendido">Vendido</option>
              <option value="retomado">Retomado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#5A5A5A] mb-1 block">Próxima ação</label>
            <input
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              value={form.next_action ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
              placeholder="Ligar segunda-feira..."
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[#5A5A5A] cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#2D4A3E]"
                checked={form.exclusivity ?? false}
                onChange={(e) => setForm((f) => ({ ...f, exclusivity: e.target.checked }))}
              />
              Exclusividade
            </label>
            <label className="flex items-center gap-2 text-sm text-[#5A5A5A] cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#2D4A3E]"
                checked={form.diario_optin ?? false}
                onChange={(e) => setForm((f) => ({ ...f, diario_optin: e.target.checked }))}
              />
              Diário do Imóvel
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#E0D8CE]">
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#E0D8CE]">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.name} className="bg-[#2D4A3E] hover:bg-[#1e3329]">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LandlordCardItem({
  landlord,
  onClick,
}: {
  landlord: LandlordCard
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#E0D8CE] rounded-lg p-3 cursor-pointer hover:border-[#B87333] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-[#2A2A2A] leading-snug">{landlord.name}</p>
        {landlord.exclusivity && <Star className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" fill="currentColor" />}
      </div>
      {landlord.phone && (
        <p className="flex items-center gap-1 text-xs text-[#8A8A8A]">
          <Phone className="w-3 h-3" />
          {landlord.phone}
        </p>
      )}
      {landlord.diario_optin && (
        <p className="flex items-center gap-1 text-xs text-[#2D4A3E] mt-1">
          <Rss className="w-3 h-3" />
          Diário do Imóvel ativo
        </p>
      )}
      {landlord.next_action && (
        <p className="text-xs text-[#B87333] mt-2 truncate">{landlord.next_action}</p>
      )}
    </div>
  )
}

export function ProprietariosClient({
  initialLandlords,
  columns,
}: {
  initialLandlords: LandlordCard[]
  columns: Column[]
}) {
  const [landlords, setLandlords] = useState(initialLandlords)
  const [editing, setEditing] = useState<LandlordCard | null | "new">(null)

  const grouped = columns.reduce<Record<string, LandlordCard[]>>((acc, col) => {
    acc[col.status] = landlords.filter((l) => l.status === col.status)
    return acc
  }, {})

  function handleSaved(updated: LandlordCard) {
    setLandlords((prev) => {
      const exists = prev.find((l) => l.id === updated.id)
      if (exists) return prev.map((l) => (l.id === updated.id ? updated : l))
      return [updated, ...prev]
    })
  }

  return (
    <>
      {editing !== null && (
        <LandlordModal
          landlord={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex items-center justify-end mb-4">
        <Button
          size="sm"
          onClick={() => setEditing("new")}
          className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Novo proprietário
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {columns.map((col) => {
          const cards = grouped[col.status] ?? []
          return (
            <div key={col.status} className="shrink-0 w-56 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#5A5A5A] uppercase tracking-wide">{col.label}</span>
                <span className="text-xs text-[#8A8A8A] bg-[#EAE3D9] px-1.5 py-0.5 rounded-full">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {cards.map((landlord) => (
                  <LandlordCardItem
                    key={landlord.id}
                    landlord={landlord}
                    onClick={() => setEditing(landlord)}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="border-2 border-dashed border-[#E0D8CE] rounded-lg h-16 flex items-center justify-center">
                    <span className="text-xs text-[#8A8A8A]">Vazio</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
