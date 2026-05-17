"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Transaction {
  id: string
  description: string
  commission: number
  closed_at: string
  leads?: { id: string; name: string } | null
}

interface FechamentosFormProps {
  initialTransactions: Transaction[]
  availableLeads: { id: string; name: string }[]
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

export function FechamentosForm({ initialTransactions, availableLeads }: FechamentosFormProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: "",
    commission: "",
    closed_at: new Date().toISOString().slice(0, 10),
    lead_id: "",
  })

  const total = transactions.reduce((acc, t) => acc + t.commission, 0)

  async function handleSave() {
    if (!form.description || !form.commission || !form.closed_at) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    const commission = parseFloat(form.commission.replace(",", "."))
    if (isNaN(commission) || commission <= 0) {
      toast.error("Comissão inválida")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          commission,
          closed_at: form.closed_at,
          ...(form.lead_id ? { lead_id: form.lead_id } : {}),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const newT: Transaction = await res.json()
      setTransactions((prev) => [newT, ...prev])
      setForm({ description: "", commission: "", closed_at: new Date().toISOString().slice(0, 10), lead_id: "" })
      setShowForm(false)
      toast.success("Fechamento registrado")
    } catch {
      toast.error("Erro ao salvar fechamento")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este fechamento?")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    toast.success("Fechamento removido")
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8A8A8A] uppercase tracking-widest">Comissão acumulada no Pacto</p>
          <p className="text-2xl font-bold text-[#2D4A3E] mt-0.5">{fmt(total)}</p>
          <p className="text-xs text-[#8A8A8A]">Meta: {fmt(50000)} · faltam {fmt(Math.max(0, 50000 - total))}</p>
        </div>
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-[#2D4A3E]/10">
          <TrendingUp className="w-7 h-7 text-[#2D4A3E]" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-[#E0D8CE] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2D4A3E] rounded-full transition-all"
          style={{ width: `${Math.min(100, (total / 50000) * 100)}%` }}
        />
      </div>

      {/* Add button */}
      <Button
        size="sm"
        className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white gap-1.5"
        onClick={() => setShowForm(!showForm)}
      >
        <Plus className="w-3.5 h-3.5" />
        Registrar fechamento
      </Button>

      {/* Form */}
      {showForm && (
        <div className="border border-[#E0D8CE] rounded-xl p-5 space-y-4 bg-white">
          <p className="text-sm font-medium text-[#2D4A3E]">Novo fechamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descrição *</Label>
              <Input
                placeholder="Ex: Venda apartamento Higienópolis"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comissão (R$) *</Label>
              <Input
                placeholder="15000"
                value={form.commission}
                onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data do fechamento *</Label>
              <Input
                type="date"
                value={form.closed_at}
                onChange={(e) => setForm((f) => ({ ...f, closed_at: e.target.value }))}
              />
            </div>
            {availableLeads.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Lead relacionado (opcional)</Label>
                <select
                  className="w-full border border-[#E0D8CE] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                  value={form.lead_id}
                  onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
                >
                  <option value="">— nenhum —</option>
                  {availableLeads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* List */}
      {transactions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-[#8A8A8A] uppercase tracking-widest">Fechamentos registrados</p>
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border border-[#E0D8CE] rounded-xl p-4 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2A2A2A] truncate">{t.description}</p>
                <p className="text-xs text-[#8A8A8A] mt-0.5">
                  {new Date(t.closed_at).toLocaleDateString("pt-BR")}
                  {t.leads ? ` · ${t.leads.name}` : ""}
                </p>
              </div>
              <p className="text-sm font-bold text-[#2D4A3E] shrink-0">{fmt(t.commission)}</p>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-[#8A8A8A] hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8A8A8A] text-center py-4">Nenhum fechamento registrado ainda.</p>
      )}
    </div>
  )
}
