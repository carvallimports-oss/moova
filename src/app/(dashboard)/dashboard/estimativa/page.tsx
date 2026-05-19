"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calculator, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type PropertyCondition = "novo" | "otimo" | "bom" | "regular" | "reforma"

type EstimativaResult = {
  price_min: number
  price_max: number
  price_suggested: number
  price_per_sqm: number
  margin_of_error: string
  market_context: string
  factors_positive: string[]
  factors_negative: string[]
  comparables: Array<{ description: string; price: number; distance: string }>
  recommendation: string
}

type Estimate = {
  id: string
  address: string
  city: string
  state: string
  property_type: string
  area_sqm: number
  bedrooms: number | null
  condition: string
  result: EstimativaResult
  disclaimer: string
  created_at: string
}

const CONDITIONS: { value: PropertyCondition; label: string }[] = [
  { value: "novo", label: "Novo / Na planta" },
  { value: "otimo", label: "Ótimo estado" },
  { value: "bom", label: "Bom estado" },
  { value: "regular", label: "Regular (algumas pendências)" },
  { value: "reforma", label: "Precisa de reforma" },
]

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "sala", label: "Sala/Conjunto" },
]

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
]

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export default function EstimativaPage() {
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("SP")
  const [propertyType, setPropertyType] = useState("apartamento")
  const [areaSqm, setAreaSqm] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [condition, setCondition] = useState<PropertyCondition>("bom")
  const [extraNotes, setExtraNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EstimativaResult | null>(null)
  const [disclaimer, setDisclaimer] = useState("")
  const [history, setHistory] = useState<Estimate[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/estimativa").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setHistory(d)
    })
  }, [])

  async function handleGenerate() {
    if (!address.trim() || !city.trim() || !areaSqm) {
      toast.error("Preencha endereço, cidade e área.")
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/estimativa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          city,
          state,
          property_type: propertyType,
          area_sqm: Number(areaSqm),
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          condition,
          extra_notes: extraNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.result)
      setDisclaimer(data.disclaimer)
      const updated = await fetch("/api/estimativa").then((r) => r.json())
      if (Array.isArray(updated)) setHistory(updated)
      toast.success("Estimativa gerada.")
    } catch {
      toast.error("Erro ao gerar estimativa. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Moova Estimativa</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">Análise comparativa de mercado (CMA) com base em IA.</p>
      </div>

      <div className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-5">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Dados do imóvel</h2>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="space-y-1 sm:col-span-4">
            <label className="text-xs font-medium text-[#5A5A5A]">Endereço *</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="text-xs font-medium text-[#5A5A5A]">Cidade *</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5A5A5A]">Estado</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            >
              {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-[#5A5A5A]">Área (m²) *</label>
            <input
              type="number"
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              placeholder="85"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-[#5A5A5A]">Quartos</label>
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="3"
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
          <div className="space-y-1 sm:col-span-6">
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
          <div className="space-y-1 sm:col-span-6">
            <label className="text-xs font-medium text-[#5A5A5A]">Estado de conservação</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    condition === c.value
                      ? "bg-[#2D4A3E] text-white border-[#2D4A3E]"
                      : "border-[#E0D8CE] text-[#5A5A5A] hover:border-[#2D4A3E]"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 sm:col-span-6">
            <label className="text-xs font-medium text-[#5A5A5A]">Informações adicionais (opcional)</label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Vista permanente para o mar, condomínio alto padrão, vaga dupla, depósito privativo..."
              className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !address.trim() || !city.trim() || !areaSqm}
          className="w-full bg-[#2D4A3E] hover:bg-[#1e3329] gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando mercado...</>
            : <><Calculator className="w-4 h-4" /> Gerar estimativa de preço</>}
        </Button>
      </div>

      {result && (
        <div className="bg-white border border-[#2D4A3E]/30 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#B87333] rounded-full" />
            <h2 className="font-serif text-lg text-[#2D4A3E]">Análise comparativa de mercado</h2>
          </div>

          {/* Price range */}
          <div className="bg-[#FAF7F2] rounded-xl p-5 space-y-3">
            <div className="text-center">
              <p className="text-xs text-[#8A8A8A] uppercase tracking-wide mb-1">Valor sugerido</p>
              <p className="font-serif text-3xl text-[#2D4A3E] font-semibold">{fmt(result.price_suggested)}</p>
              <p className="text-xs text-[#8A8A8A] mt-1">
                Faixa: {fmt(result.price_min)} — {fmt(result.price_max)} · Margem: {result.margin_of_error}
              </p>
            </div>
            <div className="border-t border-[#E0D8CE] pt-3 flex items-center justify-center gap-2">
              <p className="text-sm text-[#5A5A5A]">
                <span className="font-medium text-[#2D4A3E]">{fmt(result.price_per_sqm)}/m²</span>
              </p>
            </div>
          </div>

          {/* Context */}
          <div>
            <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide mb-2">Contexto de mercado</p>
            <p className="text-sm text-[#5A5A5A] leading-relaxed">{result.market_context}</p>
          </div>

          {/* Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.factors_positive.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-700">Valoriza</p>
                </div>
                <ul className="space-y-1">
                  {result.factors_positive.map((f, i) => (
                    <li key={i} className="text-xs text-green-700 flex gap-1.5">
                      <span className="shrink-0">+</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.factors_negative.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-xs font-semibold text-red-700">Desvaloriza</p>
                </div>
                <ul className="space-y-1">
                  {result.factors_negative.map((f, i) => (
                    <li key={i} className="text-xs text-red-700 flex gap-1.5">
                      <span className="shrink-0">−</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Comparables */}
          {result.comparables.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide mb-2">Comparáveis estimados</p>
              <div className="space-y-2">
                {result.comparables.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-[#F0EBE3] last:border-0">
                    <p className="text-sm text-[#5A5A5A] flex-1">{c.description}</p>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-[#2D4A3E]">{fmt(c.price)}</p>
                      <p className="text-xs text-[#8A8A8A]">{c.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-[#EAE3D9] rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Minus className="w-4 h-4 text-[#B87333]" />
              <p className="text-xs font-semibold text-[#2D4A3E]">Recomendação da Cora</p>
            </div>
            <p className="text-sm text-[#5A5A5A] leading-relaxed">{result.recommendation}</p>
          </div>

          <div className="text-xs text-[#8A8A8A] bg-[#FAF7F2] rounded-lg p-3 leading-relaxed">
            ⚠️ {disclaimer}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#2D4A3E]">Estimativas anteriores</h2>
          {history.map((h) => (
            <div key={h.id} className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAF7F2] transition-colors"
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}
              >
                <div>
                  <p className="text-sm font-medium text-[#2A2A2A] line-clamp-1">{h.address}</p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    {h.city}/{h.state} · {h.area_sqm}m² · {fmt(h.result.price_suggested)} sugerido ·{" "}
                    {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {expanded === h.id
                  ? <ChevronUp className="w-4 h-4 text-[#8A8A8A] shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-[#8A8A8A] shrink-0" />}
              </button>
              {expanded === h.id && (
                <div className="px-5 pb-5 border-t border-[#E0D8CE] pt-4 space-y-3">
                  <div className="bg-[#FAF7F2] rounded-lg p-4 text-center">
                    <p className="font-serif text-2xl text-[#2D4A3E]">{fmt(h.result.price_suggested)}</p>
                    <p className="text-xs text-[#8A8A8A] mt-1">
                      {fmt(h.result.price_min)} — {fmt(h.result.price_max)} · {fmt(h.result.price_per_sqm)}/m²
                    </p>
                  </div>
                  <p className="text-sm text-[#5A5A5A] leading-relaxed">{h.result.market_context}</p>
                  <div className="bg-[#EAE3D9] rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#2D4A3E] mb-1">Recomendação</p>
                    <p className="text-sm text-[#5A5A5A]">{h.result.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
