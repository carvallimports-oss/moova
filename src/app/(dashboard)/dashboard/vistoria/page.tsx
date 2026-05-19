"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ClipboardList, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type RoomCondition = "otimo" | "bom" | "regular" | "ruim" | "pessimo"
type PropertyType = "apartamento" | "casa" | "comercial" | "terreno" | "sala"

type Room = { name: string; condition: RoomCondition; observations: string }

type Inspection = {
  id: string
  address: string
  property_type: string | null
  area_sqm: number | null
  general_observations: string | null
  report: string
  status: string
  created_at: string
}

const CONDITION_LABELS: Record<RoomCondition, string> = {
  otimo: "Ótimo",
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  pessimo: "Péssimo",
}

const CONDITION_COLORS: Record<RoomCondition, string> = {
  otimo: "text-green-600",
  bom: "text-blue-600",
  regular: "text-yellow-600",
  ruim: "text-orange-600",
  pessimo: "text-red-600",
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "sala", label: "Sala/Conjunto" },
]

const DEFAULT_ROOMS: Room[] = [
  { name: "Sala de estar", condition: "bom", observations: "" },
  { name: "Cozinha", condition: "bom", observations: "" },
  { name: "Quarto principal", condition: "bom", observations: "" },
  { name: "Banheiro", condition: "bom", observations: "" },
]

export default function VistoriaPage() {
  const [address, setAddress] = useState("")
  const [propertyType, setPropertyType] = useState<PropertyType>("apartamento")
  const [areaSqm, setAreaSqm] = useState("")
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS)
  const [generalObs, setGeneralObs] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState("")
  const [history, setHistory] = useState<Inspection[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/vistoria").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setHistory(d)
    })
  }, [])

  function addRoom() {
    setRooms((prev) => [...prev, { name: "", condition: "bom", observations: "" }])
  }

  function removeRoom(idx: number) {
    setRooms((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRoom(idx: number, field: keyof Room, value: string) {
    setRooms((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleGenerate() {
    if (!address.trim()) { toast.error("Informe o endereço do imóvel."); return }
    if (rooms.length === 0) { toast.error("Adicione ao menos um cômodo."); return }
    setLoading(true)
    setReport("")
    try {
      const res = await fetch("/api/vistoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          property_type: propertyType,
          area_sqm: areaSqm ? Number(areaSqm) : undefined,
          rooms,
          general_observations: generalObs || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.report)
      const updated = await fetch("/api/vistoria").then((r) => r.json())
      if (Array.isArray(updated)) setHistory(updated)
      toast.success("Laudo gerado com sucesso.")
    } catch {
      toast.error("Erro ao gerar laudo. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Moova Vistoria</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">Gere laudos de vistoria profissionais com apoio da IA.</p>
      </div>

      <div className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-5">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Nova vistoria</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-[#5A5A5A]">Endereço do imóvel *</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5A5A5A]">Área (m²)</label>
            <input
              type="number"
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              placeholder="Ex: 85"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="text-xs font-medium text-[#5A5A5A]">Tipo de imóvel</label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setPropertyType(t.value)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    propertyType === t.value
                      ? "bg-[#2D4A3E] text-white border-[#2D4A3E]"
                      : "border-[#E0D8CE] text-[#5A5A5A] hover:border-[#2D4A3E]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#5A5A5A]">Cômodos *</label>
            <button onClick={addRoom} className="text-xs text-[#2D4A3E] flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Adicionar cômodo
            </button>
          </div>
          {rooms.map((room, idx) => (
            <div key={idx} className="bg-[#FAF7F2] rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={room.name}
                  onChange={(e) => updateRoom(idx, "name", e.target.value)}
                  placeholder="Nome do cômodo"
                  className="flex-1 border border-[#E0D8CE] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
                />
                <select
                  value={room.condition}
                  onChange={(e) => updateRoom(idx, "condition", e.target.value)}
                  className="border border-[#E0D8CE] rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
                >
                  {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeRoom(idx)}
                  className="text-[#8A8A8A] hover:text-red-600 transition-colors px-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                value={room.observations}
                onChange={(e) => updateRoom(idx, "observations", e.target.value)}
                placeholder="Observações (opcional)"
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#5A5A5A]">Observações gerais</label>
          <textarea
            value={generalObs}
            onChange={(e) => setGeneralObs(e.target.value)}
            rows={3}
            placeholder="Ex: Imóvel com umidade na parede norte, infiltração no teto da garagem..."
            className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !address.trim()}
          className="w-full bg-[#2D4A3E] hover:bg-[#1e3329] gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando laudo...</>
            : <><ClipboardList className="w-4 h-4" /> Gerar laudo de vistoria</>}
        </Button>
      </div>

      {report && (
        <div className="bg-white border border-[#2D4A3E]/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#B87333] rounded-full" />
            <h2 className="font-serif text-lg text-[#2D4A3E]">Laudo gerado</h2>
          </div>
          <div className="prose prose-sm max-w-none text-[#2A2A2A] whitespace-pre-wrap leading-relaxed text-sm">
            {report}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#2D4A3E]">Vistorias anteriores</h2>
          {history.map((h) => (
            <div key={h.id} className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAF7F2] transition-colors"
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}
              >
                <div>
                  <p className="text-sm font-medium text-[#2A2A2A] line-clamp-1">{h.address}</p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    {h.property_type && <span className="capitalize">{h.property_type} · </span>}
                    {h.area_sqm && <span>{h.area_sqm}m² · </span>}
                    {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {expanded === h.id
                  ? <ChevronUp className="w-4 h-4 text-[#8A8A8A] shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-[#8A8A8A] shrink-0" />}
              </button>
              {expanded === h.id && (
                <div className="px-5 pb-5 border-t border-[#E0D8CE]">
                  {h.general_observations && (
                    <div className="mt-3 mb-2">
                      <p className="text-xs text-[#8A8A8A] font-medium uppercase tracking-wide mb-1">Observações gerais</p>
                      <p className="text-sm text-[#5A5A5A]">{h.general_observations}</p>
                    </div>
                  )}
                  <p className="text-xs text-[#8A8A8A] font-medium uppercase tracking-wide mt-3 mb-1">Laudo</p>
                  <p className="text-sm text-[#2A2A2A] whitespace-pre-wrap leading-relaxed">{h.report}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
