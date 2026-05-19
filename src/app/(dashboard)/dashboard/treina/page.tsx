"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dumbbell, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Lead = { id: string; name: string; status: string; temperature: string | null }
type Session = { id: string; context: string; briefing: string; meeting_at: string | null; outcome: string | null; created_at: string }

const CATEGORIES = [
  { key: "geral", label: "Reunião geral" },
  { key: "visita", label: "Visita ao imóvel" },
  { key: "negociacao", label: "Negociação de valor" },
  { key: "fechamento", label: "Reunião de fechamento" },
]

export default function TreinaPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedLead, setSelectedLead] = useState("")
  const [context, setContext] = useState("")
  const [meetingAt, setMeetingAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState("")
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((data) => setLeads(Array.isArray(data) ? data : []))
    fetch("/api/cora/treina").then((r) => r.json()).then((data) => setSessions(Array.isArray(data) ? data : []))
  }, [])

  async function handleGenerate() {
    if (!context.trim()) { toast.error("Descreva o contexto da reunião."); return }
    setLoading(true)
    setBriefing("")
    try {
      const res = await fetch("/api/cora/treina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: selectedLead || undefined,
          context,
          meeting_at: meetingAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBriefing(data.briefing)
      const updated = await fetch("/api/cora/treina").then((r) => r.json())
      setSessions(Array.isArray(updated) ? updated : [])
    } catch {
      toast.error("Erro ao gerar briefing. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Cora me Treina</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">Coach de negociação — prepare-se antes de cada reunião.</p>
      </div>

      <div className="bg-white border border-[#E0D8CE] rounded-xl p-6 space-y-5">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Nova sessão de coaching</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#5A5A5A]">Cliente (opcional)</label>
          <select
            value={selectedLead}
            onChange={(e) => setSelectedLead(e.target.value)}
            className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
          >
            <option value="">Selecionar lead (opcional)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name} — {l.temperature ?? l.status}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#5A5A5A]">Data/hora da reunião (opcional)</label>
          <input
            type="datetime-local"
            value={meetingAt}
            onChange={(e) => setMeetingAt(e.target.value)}
            className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#5A5A5A]">Contexto da reunião *</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
            placeholder="Ex: Reunião para apresentar apê de 3 dorms em Pinheiros, R$ 850k. Cliente pediu 5% de desconto. Tem esposa que ainda não viu o imóvel. Financiará 60%."
            className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]/20"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !context.trim()}
          className="w-full bg-[#2D4A3E] hover:bg-[#1e3329] gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando briefing...</> : <><Dumbbell className="w-4 h-4" /> Preparar reunião</>}
        </Button>
      </div>

      {briefing && (
        <div className="bg-white border border-[#2D4A3E]/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#B87333] rounded-full" />
            <h2 className="font-serif text-lg text-[#2D4A3E]">Seu briefing de negociação</h2>
          </div>
          <div className="prose prose-sm max-w-none text-[#2A2A2A] whitespace-pre-wrap leading-relaxed text-sm">
            {briefing}
          </div>
          <p className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3">
            Sugestão de apoio — você decide. A Cora nunca sugere mentir ou pressionar o cliente.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#2D4A3E]">Sessões anteriores</h2>
          {sessions.map((s) => (
            <div key={s.id} className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAF7F2] transition-colors"
                onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
              >
                <div>
                  <p className="text-sm font-medium text-[#2A2A2A] line-clamp-1">{s.context.slice(0, 80)}...</p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {s.outcome && <span className="ml-2 text-[#2D4A3E] font-medium">· {s.outcome.replace("_", " ")}</span>}
                  </p>
                </div>
                {expandedSession === s.id ? <ChevronUp className="w-4 h-4 text-[#8A8A8A]" /> : <ChevronDown className="w-4 h-4 text-[#8A8A8A]" />}
              </button>
              {expandedSession === s.id && (
                <div className="px-5 pb-5 border-t border-[#E0D8CE]">
                  <p className="text-xs text-[#8A8A8A] mt-3 mb-1 font-medium uppercase tracking-wide">Contexto</p>
                  <p className="text-sm text-[#5A5A5A]">{s.context}</p>
                  <p className="text-xs text-[#8A8A8A] mt-4 mb-1 font-medium uppercase tracking-wide">Briefing</p>
                  <p className="text-sm text-[#2A2A2A] whitespace-pre-wrap leading-relaxed">{s.briefing}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
