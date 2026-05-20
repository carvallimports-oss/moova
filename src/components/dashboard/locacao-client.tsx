"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, FileText, DollarSign, CheckCircle2, AlertCircle, Clock, Ban } from "lucide-react"

type Contract = {
  id: string
  tenant_name: string
  tenant_phone: string | null
  tenant_email: string | null
  address: string | null
  rent_value: number
  admin_fee_pct: number
  start_date: string
  end_date: string | null
  status: string
  guarantee_type: string | null
  payment_day: number
  created_at: string
}

const STATUS_MAP = {
  rascunho:    { label: "Rascunho",     color: "bg-gray-100 text-gray-700", icon: FileText },
  vigente:     { label: "Vigente",      color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  inadimplente:{ label: "Inadimplente", color: "bg-red-100 text-red-700", icon: AlertCircle },
  encerrado:   { label: "Encerrado",    color: "bg-gray-100 text-gray-500", icon: Ban },
  rescindido:  { label: "Rescindido",   color: "bg-orange-100 text-orange-700", icon: Clock },
}

const GUARANTEE_MAP: Record<string, string> = {
  caucao: "Caução",
  fianca: "Fiança",
  seguro_fianca: "Seguro Fiança",
  titulo_capitalizacao: "Título de Capitalização",
}

const emptyForm = {
  tenant_name: "", tenant_cpf: "", tenant_phone: "", tenant_email: "",
  address: "", rent_value: "", admin_fee_pct: "10", iptu_monthly: "0",
  condominium: "0", guarantee_type: "seguro_fianca", start_date: "",
  duration_months: "30", payment_day: "5", reajuste_index: "igpm", status: "vigente",
}

export function LocacaoClient({ initialContracts }: { initialContracts: Contract[] }) {
  const [contracts, setContracts] = useState(initialContracts)
  const [filter, setFilter] = useState("todos")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [chargeLoading, setChargeLoading] = useState(false)

  const filtered = filter === "todos" ? contracts : contracts.filter(c => c.status === filter)

  function fmtBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  async function handleSave() {
    if (!form.tenant_name || !form.rent_value || !form.start_date) {
      toast.error("Preencha nome do inquilino, valor do aluguel e data de início")
      return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        rent_value: parseFloat(form.rent_value),
        admin_fee_pct: parseFloat(form.admin_fee_pct),
        iptu_monthly: parseFloat(form.iptu_monthly || "0"),
        condominium: parseFloat(form.condominium || "0"),
        duration_months: parseInt(form.duration_months),
        payment_day: parseInt(form.payment_day),
      }
      const res = await fetch("/api/rental", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error("Erro ao salvar contrato")
      const created = await res.json()
      setContracts(prev => [created, ...prev])
      setOpen(false)
      setForm(emptyForm)
      toast.success("Contrato criado com sucesso")
    } catch {
      toast.error("Erro ao salvar contrato")
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid(contractId: string) {
    const contract = contracts.find(c => c.id === contractId)
    if (!contract) return
    setChargeLoading(true)
    try {
      const today = new Date()
      const refMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
      const dueDate = new Date(today.getFullYear(), today.getMonth(), contract.payment_day)

      const chargeRes = await fetch("/api/rental/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId,
          reference_month: refMonth,
          rent_value: contract.rent_value,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pago",
        }),
      })
      if (!chargeRes.ok) throw new Error()
      toast.success("Pagamento registrado e repasse calculado")
      setChargeOpen(false)
    } catch {
      toast.error("Erro ao registrar pagamento")
    } finally {
      setChargeLoading(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/rental/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      toast.success("Status atualizado")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["todos", "vigente", "inadimplente", "encerrado", "rascunho"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                filter === s ? "bg-[#30360E] text-white" : "bg-[#E2D4B9] text-[#4A4A3A] hover:bg-[#D4C5A0]"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_MAP[s as keyof typeof STATUS_MAP]?.label ?? s}
              <span className="ml-1.5 opacity-60">
                {s === "todos" ? contracts.length : contracts.filter(c => c.status === s).length}
              </span>
            </button>
          ))}
        </div>

        <Button size="sm" className="bg-[#30360E] hover:bg-[#4A5218] text-white gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Novo contrato
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#30360E]">Novo Contrato de Locação</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Nome do inquilino *</Label>
                <Input value={form.tenant_name} onChange={e => setForm(p => ({ ...p, tenant_name: e.target.value }))} placeholder="João da Silva" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">CPF</Label>
                <Input value={form.tenant_cpf} onChange={e => setForm(p => ({ ...p, tenant_cpf: e.target.value }))} placeholder="000.000.000-00" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">WhatsApp</Label>
                <Input value={form.tenant_phone} onChange={e => setForm(p => ({ ...p, tenant_phone: e.target.value }))} placeholder="(11) 99999-9999" className="border-[#D4C5A0]" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Email</Label>
                <Input type="email" value={form.tenant_email} onChange={e => setForm(p => ({ ...p, tenant_email: e.target.value }))} placeholder="inquilino@email.com" className="border-[#D4C5A0]" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Endereço do imóvel</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua das Flores, 123 — Apto 45" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Valor do aluguel (R$) *</Label>
                <Input type="number" value={form.rent_value} onChange={e => setForm(p => ({ ...p, rent_value: e.target.value }))} placeholder="2500.00" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Taxa de administração (%)</Label>
                <Input type="number" value={form.admin_fee_pct} onChange={e => setForm(p => ({ ...p, admin_fee_pct: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">IPTU mensal (R$)</Label>
                <Input type="number" value={form.iptu_monthly} onChange={e => setForm(p => ({ ...p, iptu_monthly: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Condomínio (R$)</Label>
                <Input type="number" value={form.condominium} onChange={e => setForm(p => ({ ...p, condominium: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Data de início *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Duração (meses)</Label>
                <Input type="number" value={form.duration_months} onChange={e => setForm(p => ({ ...p, duration_months: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Dia de vencimento</Label>
                <Input type="number" min={1} max={28} value={form.payment_day} onChange={e => setForm(p => ({ ...p, payment_day: e.target.value }))} className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Índice de reajuste</Label>
                <Select value={form.reajuste_index} onValueChange={v => setForm(p => ({ ...p, reajuste_index: v ?? "igpm" }))}>
                  <SelectTrigger className="border-[#D4C5A0]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igpm">IGP-M</SelectItem>
                    <SelectItem value="ipca">IPCA</SelectItem>
                    <SelectItem value="incc">INCC</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Garantia</Label>
                <Select value={form.guarantee_type} onValueChange={v => setForm(p => ({ ...p, guarantee_type: v ?? "seguro_fianca" }))}>
                  <SelectTrigger className="border-[#D4C5A0]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seguro_fianca">Seguro Fiança</SelectItem>
                    <SelectItem value="caucao">Caução</SelectItem>
                    <SelectItem value="fianca">Fiança</SelectItem>
                    <SelectItem value="titulo_capitalizacao">Título de Capitalização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#D4C5A0]">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#30360E] hover:bg-[#4A5218] text-white">
                {saving ? "Salvando..." : "Criar contrato"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#7A7A6A]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum contrato {filter !== "todos" ? `com status "${filter}"` : ""}</p>
          <p className="text-xs mt-1">Clique em "Novo contrato" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(contract => {
            const statusInfo = STATUS_MAP[contract.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.rascunho
            const StatusIcon = statusInfo.icon
            const adminFee = contract.rent_value * (contract.admin_fee_pct / 100)
            const netToLandlord = contract.rent_value - adminFee

            return (
              <Card key={contract.id} className="border-[#D4C5A0] hover:border-[#787F56] transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2A2A2A] truncate">{contract.tenant_name}</p>
                      {contract.address && (
                        <p className="text-xs text-[#7A7A6A] truncate mt-0.5">{contract.address}</p>
                      )}
                    </div>
                    <Badge className={`${statusInfo.color} border-0 text-[10px] shrink-0 ml-2`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-[#F5F0E0] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#7A7A6A] uppercase tracking-wide">Aluguel</p>
                      <p className="font-semibold text-[#30360E]">{fmtBRL(contract.rent_value)}</p>
                    </div>
                    <div className="bg-[#EEF0E8] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#7A7A6A] uppercase tracking-wide">Repasse líquido</p>
                      <p className="font-semibold text-[#787F56]">{fmtBRL(netToLandlord)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7A7A6A]">
                    <span>Vence dia {contract.payment_day}</span>
                    {contract.guarantee_type && (
                      <span className="bg-[#E2D4B9] text-[#4A4A3A] px-2 py-0.5 rounded-full">
                        {GUARANTEE_MAP[contract.guarantee_type] ?? contract.guarantee_type}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {contract.status === "vigente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-[#787F56] text-[#787F56] hover:bg-[#EEF0E8]"
                        onClick={() => { setSelectedId(contract.id); setChargeOpen(true) }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Registrar pagamento
                      </Button>
                    )}
                    <Select
                      value={contract.status}
                      onValueChange={v => v && handleStatusChange(contract.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs border-[#D4C5A0] w-auto min-w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                        <SelectItem value="rescindido">Rescindido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Register Payment Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-[#30360E]">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedId && (() => {
            const c = contracts.find(x => x.id === selectedId)
            if (!c) return null
            const fee = c.rent_value * (c.admin_fee_pct / 100)
            return (
              <div className="space-y-4 mt-2">
                <div className="bg-[#F5F0E0] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7A7A6A]">Aluguel</span>
                    <span className="font-medium text-[#2A2A2A]">{fmtBRL(c.rent_value)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7A7A6A]">Taxa ({c.admin_fee_pct}%)</span>
                    <span className="text-[#787F56]">- {fmtBRL(fee)}</span>
                  </div>
                  <div className="border-t border-[#D4C5A0] pt-2 flex justify-between">
                    <span className="font-medium text-[#2A2A2A]">Repasse líquido</span>
                    <span className="font-bold text-[#30360E]">{fmtBRL(c.rent_value - fee)}</span>
                  </div>
                </div>
                <p className="text-xs text-[#7A7A6A]">
                  Isso registrará o pagamento do mês atual e calculará o repasse ao proprietário automaticamente.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setChargeOpen(false)} className="border-[#D4C5A0]">Cancelar</Button>
                  <Button
                    onClick={() => handleMarkPaid(selectedId)}
                    disabled={chargeLoading}
                    className="bg-[#30360E] hover:bg-[#4A5218] text-white"
                  >
                    {chargeLoading ? "Registrando..." : "Confirmar recebimento"}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
