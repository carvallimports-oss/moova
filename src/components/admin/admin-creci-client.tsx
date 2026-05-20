"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreciValidation {
  id: string
  creci: string
  state: string
  status: string
  notes: string | null
  validated_at: string | null
  created_at: string
  users: {
    id: string
    name: string
    email: string
    phone: string
    created_at: string
  } | null
}

interface AdminCreciClientProps {
  pending: CreciValidation[]
  resolved: CreciValidation[]
}

const STATUS_LABEL: Record<string, string> = {
  valid: "Aprovado",
  invalid: "Reprovado",
  manual: "Manual",
  pending: "Pendente",
}

const STATUS_COLOR: Record<string, string> = {
  valid: "text-green-700 bg-green-50 border-green-200",
  invalid: "text-red-700 bg-red-50 border-red-200",
  manual: "text-blue-700 bg-blue-50 border-blue-200",
  pending: "text-orange-700 bg-orange-50 border-orange-200",
}

function CreciCard({
  v,
  onUpdate,
}: {
  v: CreciValidation
  onUpdate: (id: string, status: "valid" | "invalid" | "manual", notes?: string) => void
}) {
  const [notes, setNotes] = useState(v.notes ?? "")
  const [loading, setLoading] = useState(false)

  async function update(status: "valid" | "invalid" | "manual") {
    setLoading(true)
    const res = await fetch("/api/admin/creci", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, status, notes }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success(`CRECI ${STATUS_LABEL[status].toLowerCase()}`)
      onUpdate(v.id, status, notes)
    } else {
      toast.error("Erro ao atualizar")
    }
  }

  return (
    <div className="border border-[#D4C5A0] rounded-xl p-5 bg-white space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#30360E]/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-[#30360E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#2A2A2A]">{v.users?.name ?? "—"}</p>
          <p className="text-xs text-[#7A7A6A]">{v.users?.email} · {v.users?.phone}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-mono text-xs bg-[#E2D4B9] px-2 py-0.5 rounded text-[#30360E]">
              CRECI-{v.state}: {v.creci}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[v.status]}`}>
              {STATUS_LABEL[v.status]}
            </span>
          </div>
          <p className="text-xs text-[#7A7A6A] mt-1">
            Cadastro: {new Date(v.created_at).toLocaleDateString("pt-BR")}
            {v.validated_at ? ` · Validado: ${new Date(v.validated_at).toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
      </div>

      {v.status === "pending" && (
        <div className="space-y-3">
          <textarea
            className="w-full border border-[#D4C5A0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#30360E]"
            rows={2}
            placeholder="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => update("valid")}
              disabled={loading}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aprovar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              onClick={() => update("invalid")}
              disabled={loading}
            >
              <XCircle className="w-3.5 h-3.5" />
              Reprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#D4C5A0] gap-1.5"
              onClick={() => update("manual")}
              disabled={loading}
            >
              <Clock className="w-3.5 h-3.5" />
              Aprovação manual
            </Button>
          </div>
        </div>
      )}
      {v.notes && v.status !== "pending" && (
        <p className="text-xs text-[#4A4A3A] italic border-l-2 border-[#D4C5A0] pl-3">{v.notes}</p>
      )}
    </div>
  )
}

export function AdminCreciClient({ pending: initialPending, resolved: initialResolved }: AdminCreciClientProps) {
  const [pending, setPending] = useState<CreciValidation[]>(initialPending)
  const [resolved, setResolved] = useState<CreciValidation[]>(initialResolved)

  function handleUpdate(id: string, status: "valid" | "invalid" | "manual", notes?: string) {
    const item = pending.find((v) => v.id === id)
    if (!item) return
    setPending((prev) => prev.filter((v) => v.id !== id))
    setResolved((prev) => [{ ...item, status, notes: notes ?? null, validated_at: new Date().toISOString() }, ...prev])
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="font-serif text-xl text-[#30360E]">
          Pendentes
          {pending.length > 0 && (
            <span className="ml-2 text-sm text-[#787F56] font-sans">({pending.length})</span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="border border-[#D4C5A0] rounded-xl p-8 text-center text-sm text-[#7A7A6A] bg-white">
            Nenhuma validação pendente.
          </div>
        ) : (
          pending.map((v) => <CreciCard key={v.id} v={v} onUpdate={handleUpdate} />)
        )}
      </div>

      {resolved.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-[#30360E]">Resolvidos</h2>
          {resolved.map((v) => <CreciCard key={v.id} v={v} onUpdate={handleUpdate} />)}
        </div>
      )}
    </div>
  )
}
