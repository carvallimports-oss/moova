"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Database, Copy, Check, RefreshCw, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function CmaEnterprisePage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    fetch("/api/cma-enterprise/key")
      .then((r) => r.json())
      .then((d) => { setApiKey(d.key); setLoading(false) })
  }, [])

  async function generateKey() {
    if (apiKey && !confirm("Isso vai invalidar a chave atual. Continuar?")) return
    setGenerating(true)
    try {
      const res = await fetch("/api/cma-enterprise/key", { method: "POST" })
      const d = await res.json()
      setApiKey(d.key)
      setRevealed(true)
      toast.success("Chave gerada com sucesso.")
    } catch {
      toast.error("Erro ao gerar chave.")
    } finally {
      setGenerating(false)
    }
  }

  function copyKey() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Chave copiada.")
  }

  const maskedKey = apiKey ? apiKey.slice(0, 8) + "•".repeat(24) + apiKey.slice(-4) : null

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Moova Data — CMA Enterprise</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">API B2B de análise comparativa de mercado para bancos, FIIs e seguradoras.</p>
      </div>

      {/* API Key */}
      <div className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-4">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Sua API key</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#8A8A8A]">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : apiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-[#FAF7F2] rounded-lg px-4 py-3 font-mono text-sm">
              <span className="flex-1 text-[#2A2A2A] break-all">{revealed ? apiKey : maskedKey}</span>
              <button onClick={() => setRevealed(!revealed)} className="text-[#8A8A8A] hover:text-[#2D4A3E] shrink-0">
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copyKey} className="text-[#8A8A8A] hover:text-[#2D4A3E] shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="outline" onClick={generateKey} disabled={generating}
              className="border-[#E0D8CE] text-sm gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><RefreshCw className="w-4 h-4" /> Regenerar chave</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#5A5A5A]">Você ainda não tem uma API key. Gere uma para começar a integrar.</p>
            <Button onClick={generateKey} disabled={generating} className="bg-[#2D4A3E] hover:bg-[#1e3329] gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : "Gerar API key"}
            </Button>
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-5">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Documentação da API</h2>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Endpoint</p>
          <div className="bg-[#1A2E28] rounded-lg px-4 py-3 font-mono text-sm text-green-400">
            POST https://moovaimob.com/api/cma-enterprise
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Headers</p>
          <div className="bg-[#1A2E28] rounded-lg px-4 py-3 font-mono text-xs text-green-300 space-y-1">
            <p>Content-Type: application/json</p>
            <p>X-Moova-API-Key: {"<sua-api-key>"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Request body</p>
          <div className="bg-[#1A2E28] rounded-lg px-4 py-3 font-mono text-xs text-green-300 overflow-x-auto whitespace-pre">{`{
  "address": "Rua das Flores, 123, Jardins",
  "city": "São Paulo",
  "state": "SP",
  "property_type": "apartamento",
  "area_sqm": 85,
  "bedrooms": 3,           // opcional
  "condition": "bom",      // opcional: novo|otimo|bom|regular|reforma
  "extra_notes": "...",    // opcional
  "client_ref": "REF-001"  // opcional — referência interna do cliente
}`}</div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Response</p>
          <div className="bg-[#1A2E28] rounded-lg px-4 py-3 font-mono text-xs text-green-300 overflow-x-auto whitespace-pre">{`{
  "cma": {
    "price_min": 680000,
    "price_max": 850000,
    "price_suggested": 760000,
    "price_per_sqm": 8941,
    "margin_of_error": "±11%",
    "confidence_level": "médio",
    "market_context": "...",
    "factors_positive": [...],
    "factors_negative": [...],
    "comparables": [...],
    "recommendation": "...",
    "data_quality": "..."
  },
  "meta": {
    "address": "...",
    "generated_at": "2026-05-19T10:30:00Z",
    "powered_by": "Moova Data — CMA Enterprise",
    "disclaimer": "Esta estimativa é informativa..."
  }
}`}</div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wide">Exemplo curl</p>
          <div className="bg-[#1A2E28] rounded-lg px-4 py-3 font-mono text-xs text-green-300 overflow-x-auto whitespace-pre">{`curl -X POST https://moovaimob.com/api/cma-enterprise \\
  -H "Content-Type: application/json" \\
  -H "X-Moova-API-Key: mve_sua_chave_aqui" \\
  -d '{
    "address": "Av. Paulista, 1000",
    "city": "São Paulo",
    "state": "SP",
    "property_type": "comercial",
    "area_sqm": 120
  }'`}</div>
        </div>
      </div>

      <div className="bg-[#EAE3D9] rounded-xl p-4 text-xs text-[#5A5A5A] space-y-1">
        <p className="font-medium text-[#2D4A3E]">Disclaimer obrigatório</p>
        <p>Esta estimativa é informativa e não constitui avaliação imobiliária formal (NBR 14.653). Para avaliações com validade legal, consulte profissional habilitado pelo CFC ou CRECI com curso de avaliação. O resultado da API deve conter este disclaimer em toda comunicação com o usuário final.</p>
      </div>
    </div>
  )
}
