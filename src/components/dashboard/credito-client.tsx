"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, ShieldCheck, ShieldAlert, ShieldX, Search, ChevronDown, ChevronUp } from "lucide-react"

type Analysis = {
  id: string
  subject_name: string
  subject_cpf: string
  subject_type: string
  monthly_income: number | null
  rent_requested: number | null
  income_ratio: number | null
  score: number | null
  verdict: string
  risk_level: string
  ai_summary: string | null
  ai_flags: string[]
  consulted_at: string
  valid_until: string | null
}

const VERDICT_MAP = {
  aprovado:               { label: "Aprovado",              color: "bg-green-100 text-green-700",  icon: ShieldCheck },
  aprovado_com_ressalvas: { label: "Aprovado c/ ressalvas", color: "bg-yellow-100 text-yellow-700", icon: ShieldAlert },
  reprovado:              { label: "Reprovado",             color: "bg-red-100 text-red-700",      icon: ShieldX },
  pendente:               { label: "Pendente",              color: "bg-gray-100 text-gray-600",    icon: Search },
}

const RISK_COLORS: Record<string, string> = {
  baixo:   "text-green-600",
  medio:   "text-yellow-600",
  alto:    "text-orange-600",
  critico: "text-red-600",
}

const emptyForm = {
  subject_name: "", subject_cpf: "", subject_type: "inquilino",
  monthly_income: "", rent_requested: "",
}

export function CreditoClient({ initialAnalyses }: { initialAnalyses: Analysis[] }) {
  const [analyses, setAnalyses] = useState(initialAnalyses)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  function fmtBRL(v: number | null) {
    if (v === null) return "—"
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  function cpfMask(v: string) {
    return v.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").slice(0, 14)
  }

  async function handleAnalyse() {
    if (!form.subject_name || !form.subject_cpf) {
      toast.error("Nome e CPF são obrigatórios")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/credito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
          rent_requested: form.rent_requested ? parseFloat(form.rent_requested) : null,
        }),
      })
      if (!res.ok) throw new Error("Erro ao analisar crédito")
      const created = await res.json()
      setAnalyses(prev => [created, ...prev])
      setOpen(false)
      setForm(emptyForm)
      setExpanded(created.id)
      toast.success("Análise de crédito concluída")
    } catch {
      toast.error("Erro ao processar análise")
    } finally {
      setLoading(false)
    }
  }

  function scoreBar(score: number | null) {
    if (score === null) return null
    const pct = (score / 1000) * 100
    const color = score >= 700 ? "#30360E" : score >= 500 ? "#787F56" : score >= 300 ? "#D97706" : "#DC2626"
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#7A7A6A]">Score</span>
          <span className="font-bold" style={{ color }}>{score}/1000</span>
        </div>
        <div className="h-2 bg-[#E2D4B9] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" className="bg-[#30360E] hover:bg-[#4A5218] text-white gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova análise
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#30360E]">Análise de Crédito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Tipo</Label>
                <Select value={form.subject_type} onValueChange={v => setForm(p => ({ ...p, subject_type: v ?? "inquilino" }))}>
                  <SelectTrigger className="border-[#D4C5A0]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquilino">Inquilino</SelectItem>
                    <SelectItem value="fiador">Fiador</SelectItem>
                    <SelectItem value="comprador">Comprador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Nome completo *</Label>
                <Input value={form.subject_name} onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))} placeholder="João da Silva" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">CPF *</Label>
                <Input
                  value={form.subject_cpf}
                  onChange={e => setForm(p => ({ ...p, subject_cpf: cpfMask(e.target.value) }))}
                  placeholder="000.000.000-00"
                  className="border-[#D4C5A0]"
                  maxLength={14}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Renda mensal (R$)</Label>
                <Input type="number" value={form.monthly_income} onChange={e => setForm(p => ({ ...p, monthly_income: e.target.value }))} placeholder="5000.00" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Aluguel solicitado (R$)</Label>
                <Input type="number" value={form.rent_requested} onChange={e => setForm(p => ({ ...p, rent_requested: e.target.value }))} placeholder="1500.00" className="border-[#D4C5A0]" />
              </div>
              <p className="text-[10px] text-[#7A7A6A] bg-[#F5F0E0] p-3 rounded-lg">
                A análise usa score simulado (300-800). Integração com Serasa/Boa Vista disponível no plano Maestria.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#D4C5A0]">Cancelar</Button>
              <Button onClick={handleAnalyse} disabled={loading} className="bg-[#30360E] hover:bg-[#4A5218] text-white">
                {loading ? "Analisando..." : "Analisar crédito"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-20 text-[#7A7A6A]">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma análise de crédito realizada</p>
          <p className="text-xs mt-1">Analise inquilinos, fiadores e compradores antes de fechar contratos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(a => {
            const info = VERDICT_MAP[a.verdict as keyof typeof VERDICT_MAP] ?? VERDICT_MAP.pendente
            const InfoIcon = info.icon
            const isExpanded = expanded === a.id

            return (
              <Card key={a.id} className="border-[#D4C5A0]">
                <CardContent className="p-5">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#2A2A2A]">{a.subject_name}</p>
                        <span className="text-xs text-[#7A7A6A] capitalize">{a.subject_type}</span>
                      </div>
                      <p className="text-xs text-[#7A7A6A] mt-0.5">{a.subject_cpf} · consultado em {new Date(a.consulted_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Badge className={`${info.color} border-0 text-xs shrink-0`}>
                      <InfoIcon className="w-3 h-3 mr-1" />
                      {info.label}
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#7A7A6A]" /> : <ChevronDown className="w-4 h-4 text-[#7A7A6A]" />}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-[#E2D4B9] pt-4">
                      {scoreBar(a.score)}

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-[#F5F0E0] rounded-lg p-2.5">
                          <p className="text-[10px] text-[#7A7A6A] uppercase tracking-wide">Renda</p>
                          <p className="font-medium text-[#30360E]">{fmtBRL(a.monthly_income)}</p>
                        </div>
                        <div className="bg-[#F5F0E0] rounded-lg p-2.5">
                          <p className="text-[10px] text-[#7A7A6A] uppercase tracking-wide">Aluguel</p>
                          <p className="font-medium text-[#30360E]">{fmtBRL(a.rent_requested)}</p>
                        </div>
                        <div className="bg-[#F5F0E0] rounded-lg p-2.5">
                          <p className="text-[10px] text-[#7A7A6A] uppercase tracking-wide">Comprometimento</p>
                          <p className={`font-medium ${a.income_ratio && a.income_ratio > 30 ? "text-orange-600" : "text-[#30360E]"}`}>
                            {a.income_ratio !== null ? `${a.income_ratio}%` : "—"}
                          </p>
                        </div>
                      </div>

                      {a.risk_level && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[#7A7A6A]">Nível de risco:</span>
                          <span className={`font-semibold capitalize ${RISK_COLORS[a.risk_level] ?? "text-[#2A2A2A]"}`}>
                            {a.risk_level}
                          </span>
                        </div>
                      )}

                      {a.ai_flags.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-[#4A4A3A]">Pontos de atenção</p>
                          {a.ai_flags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {a.ai_summary && (
                        <div className="bg-[#F5F0E0] rounded-xl p-4 space-y-1">
                          <p className="text-[10px] text-[#787F56] uppercase tracking-widest font-medium">Análise Cora</p>
                          <p className="text-sm text-[#2A2A2A] leading-relaxed whitespace-pre-line">{a.ai_summary}</p>
                        </div>
                      )}

                      {a.valid_until && (
                        <p className="text-[10px] text-[#7A7A6A]">Validade: {new Date(a.valid_until).toLocaleDateString("pt-BR")}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
