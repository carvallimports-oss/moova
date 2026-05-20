"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Scale, Loader2, Send, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Consultation = { id: string; question: string; answer: string; disclaimer: string; category: string; created_at: string }

const CATEGORIES = [
  { key: "geral", label: "Geral" },
  { key: "contrato", label: "Contrato compra/venda" },
  { key: "distrato", label: "Distrato" },
  { key: "locacao", label: "Locação" },
  { key: "despejo", label: "Despejo" },
  { key: "iptu", label: "IPTU" },
  { key: "itbi", label: "ITBI" },
]

const QUICK_QUESTIONS = [
  "O comprador pode desistir após assinar o contrato de reserva?",
  "Qual o prazo para devolver o sinal em caso de distrato por culpa do vendedor?",
  "Quem paga o ITBI — comprador ou vendedor?",
  "Posso cobrar mais de 1 aluguel de caução em contrato de locação?",
  "Quais documentos são obrigatórios para lavrar escritura de compra e venda?",
]

export default function DefendePage() {
  const [history, setHistory] = useState<Consultation[]>([])
  const [question, setQuestion] = useState("")
  const [category, setCategory] = useState("geral")
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/cora/defende").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) { setHistory(d); if (d.length) setExpandedId(d[0].id) }
    })
  }, [])

  async function handleAsk() {
    if (!question.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/cora/defende", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      const newConsult: Consultation = {
        id: Date.now().toString(),
        question,
        answer: data.answer,
        disclaimer: data.disclaimer,
        category,
        created_at: new Date().toISOString(),
      }
      setHistory((prev) => [newConsult, ...prev])
      setExpandedId(newConsult.id)
      setQuestion("")
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch {
      toast.error("Erro ao consultar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-5 h-5 text-[#787F56]" />
          <h1 className="font-serif text-2xl text-[#30360E]">Cora me Defende</h1>
        </div>
        <p className="text-sm text-[#7A7A6A]">Dúvidas jurídicas imobiliárias respondidas pela IA — com base na legislação brasileira.</p>
      </div>

      <div className="bg-[#E2D4B9] rounded-xl p-4 text-xs text-[#4A4A3A]">
        <span className="font-medium text-[#30360E]">Aviso importante:</span> As orientações são informativas e NÃO substituem consulta com advogado habilitado. Para casos com valor legal, procure um profissional.
      </div>

      <div className="bg-white border border-[#D4C5A0] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                category === c.key
                  ? "bg-[#30360E] text-white border-[#30360E]"
                  : "border-[#D4C5A0] text-[#4A4A3A] hover:border-[#30360E] hover:text-[#30360E]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAsk() }}
            rows={3}
            placeholder="Ex: O comprador pode desistir após 7 dias da assinatura do contrato?"
            className="w-full border border-[#D4C5A0] rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#30360E]/20 pr-12"
          />
          <Button
            size="icon"
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="absolute bottom-3 right-3 w-8 h-8 bg-[#30360E] hover:bg-[#20240A]"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#7A7A6A]">Perguntas frequentes:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                className="text-xs text-[#30360E] bg-[#E2D4B9] hover:bg-[#D4C5A0] px-2.5 py-1 rounded-lg transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#30360E]">Consultas anteriores</h2>
          {history.map((c) => (
            <div key={c.id} className="bg-white border border-[#D4C5A0] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-[#F5F0E0] transition-colors"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2A2A2A] leading-snug">{c.question}</p>
                  <p className="text-xs text-[#7A7A6A] mt-0.5">
                    {CATEGORIES.find((x) => x.key === c.category)?.label ?? c.category} ·{" "}
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-[#7A7A6A] shrink-0 mt-0.5 transition-transform", expandedId === c.id && "rotate-180")} />
              </button>
              {expandedId === c.id && (
                <div className="px-5 pb-5 border-t border-[#D4C5A0] space-y-3">
                  <div className="prose prose-sm max-w-none text-[#2A2A2A] whitespace-pre-wrap text-sm leading-relaxed mt-4">
                    {c.answer}
                  </div>
                  <div className="bg-[#E2D4B9] rounded-lg p-3 text-xs text-[#4A4A3A]">
                    ⚠️ {c.disclaimer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
