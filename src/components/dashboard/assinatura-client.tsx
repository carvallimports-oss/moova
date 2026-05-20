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
import { Plus, FileSignature, Clock, CheckCircle2, AlertCircle, Send, Trash2, User, Mail } from "lucide-react"

type SignDoc = {
  id: string
  title: string
  document_type: string
  status: string
  signatories: Array<{ name: string; email: string; sign_as: string; status?: string; sign_link?: string }>
  file_url: string | null
  sent_at: string | null
  completed_at: string | null
  expires_at: string | null
  created_at: string
}

const STATUS_MAP = {
  rascunho:   { label: "Rascunho",        color: "bg-gray-100 text-gray-600",    icon: FileSignature },
  aguardando: { label: "Aguardando",      color: "bg-yellow-100 text-yellow-700", icon: Clock },
  parcial:    { label: "Parcial",         color: "bg-blue-100 text-blue-700",    icon: Clock },
  assinado:   { label: "Assinado",        color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  cancelado:  { label: "Cancelado",       color: "bg-red-100 text-red-700",      icon: AlertCircle },
  expirado:   { label: "Expirado",        color: "bg-gray-100 text-gray-500",    icon: AlertCircle },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contrato_locacao:   "Contrato de Locação",
  contrato_compra_venda: "Compra e Venda",
  proposta:           "Proposta",
  distrato:           "Distrato",
  vistoria:           "Laudo de Vistoria",
  outro:              "Outro",
}

const emptySignatory = { name: "", email: "", sign_as: "contratante" }

export function AssinaturaClient({ initialDocs }: { initialDocs: SignDoc[] }) {
  const [docs, setDocs] = useState(initialDocs)
  const [filter, setFilter] = useState("todos")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    document_type: "contrato_locacao",
    file_url: "",
  })
  const [signatories, setSignatories] = useState([{ ...emptySignatory }])

  const filtered = filter === "todos" ? docs : docs.filter(d => d.status === filter)

  function addSignatory() {
    setSignatories(prev => [...prev, { ...emptySignatory }])
  }

  function removeSignatory(i: number) {
    setSignatories(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateSignatory(i: number, field: string, value: string) {
    setSignatories(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    if (!form.title || signatories.some(s => !s.name || !s.email)) {
      toast.error("Preencha título e todos os signatários")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, signatories }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setDocs(prev => [created, ...prev])
      setOpen(false)
      setForm({ title: "", document_type: "contrato_locacao", file_url: "" })
      setSignatories([{ ...emptySignatory }])
      toast.success("Documento criado")
    } catch {
      toast.error("Erro ao criar documento")
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(id: string) {
    setSending(id)
    try {
      const res = await fetch(`/api/assinatura/${id}/send`, { method: "POST" })
      if (!res.ok) throw new Error()
      const { document } = await res.json()
      setDocs(prev => prev.map(d => d.id === id ? { ...d, ...document } : d))
      toast.success("Documento enviado para assinatura")
    } catch {
      toast.error("Erro ao enviar documento")
    } finally {
      setSending(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este documento?")) return
    const res = await fetch(`/api/assinatura/${id}`, { method: "DELETE" })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id))
      toast.success("Documento excluído")
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters + New button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["todos", "rascunho", "aguardando", "assinado"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                filter === s ? "bg-[#30360E] text-white" : "bg-[#E2D4B9] text-[#4A4A3A] hover:bg-[#D4C5A0]"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_MAP[s as keyof typeof STATUS_MAP]?.label ?? s}
              <span className="ml-1.5 opacity-60">
                {s === "todos" ? docs.length : docs.filter(d => d.status === s).length}
              </span>
            </button>
          ))}
        </div>

        <Button size="sm" className="bg-[#30360E] hover:bg-[#4A5218] text-white gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Novo documento
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#30360E]">Novo Documento para Assinatura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Título do documento *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Contrato de Locação — Rua das Flores 123" className="border-[#D4C5A0]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">Tipo</Label>
                <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v ?? "contrato_locacao" }))}>
                  <SelectTrigger className="border-[#D4C5A0]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#4A4A3A]">URL do documento (PDF)</Label>
                <Input value={form.file_url} onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))} placeholder="https://..." className="border-[#D4C5A0]" />
                <p className="text-[10px] text-[#7A7A6A]">Hospede o PDF e cole o link. Integração D4Sign ativa quando token configurado.</p>
              </div>

              {/* Signatories */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#4A4A3A]">Signatários *</Label>
                  <button onClick={addSignatory} className="text-xs text-[#787F56] hover:text-[#30360E]">+ Adicionar</button>
                </div>
                {signatories.map((s, i) => (
                  <div key={i} className="bg-[#F5F0E0] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#4A4A3A]">Signatário {i + 1}</span>
                      {signatories.length > 1 && (
                        <button onClick={() => removeSignatory(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Input value={s.name} onChange={e => updateSignatory(i, "name", e.target.value)} placeholder="Nome completo" className="bg-white border-[#D4C5A0] text-sm h-8" />
                    <Input type="email" value={s.email} onChange={e => updateSignatory(i, "email", e.target.value)} placeholder="email@exemplo.com" className="bg-white border-[#D4C5A0] text-sm h-8" />
                    <Select value={s.sign_as} onValueChange={v => updateSignatory(i, "sign_as", v ?? "contratante")}>
                      <SelectTrigger className="bg-white border-[#D4C5A0] h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contratante">Contratante</SelectItem>
                        <SelectItem value="contratado">Contratado</SelectItem>
                        <SelectItem value="fiador">Fiador</SelectItem>
                        <SelectItem value="testemunha">Testemunha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#D4C5A0]">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#30360E] hover:bg-[#4A5218] text-white">
                {saving ? "Salvando..." : "Criar documento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#7A7A6A]">
          <FileSignature className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum documento {filter !== "todos" ? `com status "${filter}"` : ""}</p>
          <p className="text-xs mt-1">Crie seu primeiro documento para assinatura eletrônica</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(doc => {
            const info = STATUS_MAP[doc.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.rascunho
            const InfoIcon = info.icon
            const signed = doc.signatories.filter(s => s.status === "assinado").length
            const total = doc.signatories.length

            return (
              <Card key={doc.id} className="border-[#D4C5A0] hover:border-[#787F56] transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2A2A2A] truncate">{doc.title}</p>
                      <p className="text-xs text-[#7A7A6A] mt-0.5">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</p>
                    </div>
                    <Badge className={`${info.color} border-0 text-[10px] shrink-0`}>
                      <InfoIcon className="w-3 h-3 mr-1" />
                      {info.label}
                    </Badge>
                  </div>

                  {/* Signatories */}
                  <div className="space-y-1.5">
                    {doc.signatories.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#4A4A3A]">
                        <User className="w-3 h-3 text-[#7A7A6A] shrink-0" />
                        <span className="flex-1 truncate">{s.name}</span>
                        <Mail className="w-3 h-3 text-[#7A7A6A] shrink-0" />
                        <span className="truncate text-[#7A7A6A]">{s.email}</span>
                        {s.status === "assinado" && <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {doc.status === "aguardando" && (
                    <div className="bg-[#F5F0E0] rounded-lg px-3 py-2 text-xs text-[#4A4A3A]">
                      {signed}/{total} assinaturas coletadas
                      {doc.expires_at && (
                        <span className="text-[#7A7A6A] ml-2">· expira {new Date(doc.expires_at).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {doc.status === "rascunho" && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-[#30360E] hover:bg-[#4A5218] text-white"
                        onClick={() => handleSend(doc.id)}
                        disabled={sending === doc.id}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {sending === doc.id ? "Enviando..." : "Enviar para assinar"}
                      </Button>
                    )}
                    {doc.status === "rascunho" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-500 hover:bg-red-50 px-2"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#787F56] hover:underline flex items-center gap-1"
                      >
                        Ver PDF
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
