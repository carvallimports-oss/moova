"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CheckCircle2, XCircle, MessageSquare, Mail, Clock, Home, User } from "lucide-react"

type Landlord = {
  id: string
  name: string
  phone: string | null
  email: string | null
  diario_optin: boolean
  diario_contact: "whatsapp" | "email" | null
  status: string
  property_id: string | null
}

type Log = {
  id: string
  landlord_id: string | null
  sent_at: string
  opened_at: string | null
  content_summary: { weekly_leads?: number; weekly_visits?: number; channel?: string }
}

export function DiarioClient({ initialLandlords, recentLogs }: { initialLandlords: Landlord[]; recentLogs: Log[] }) {
  const [landlords, setLandlords] = useState(initialLandlords)
  const [updating, setUpdating] = useState<string | null>(null)

  async function toggleOptin(id: string, currentOptin: boolean, contact: string | null) {
    setUpdating(id)
    const newOptin = !currentOptin
    const newContact = newOptin ? (contact ?? "whatsapp") : contact
    try {
      const res = await fetch(`/api/landlords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diario_optin: newOptin, diario_contact: newContact }),
      })
      if (!res.ok) throw new Error()
      setLandlords(prev => prev.map(l => l.id === id ? { ...l, diario_optin: newOptin, diario_contact: newContact as "whatsapp" | "email" | null } : l))
      toast.success(newOptin ? "Diário ativado para este proprietário" : "Diário desativado")
    } catch {
      toast.error("Erro ao atualizar opt-in")
    } finally {
      setUpdating(null)
    }
  }

  async function changeChannel(id: string, channel: string) {
    const res = await fetch(`/api/landlords/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diario_contact: channel }),
    })
    if (res.ok) {
      setLandlords(prev => prev.map(l => l.id === id ? { ...l, diario_contact: channel as "whatsapp" | "email" } : l))
      toast.success("Canal atualizado")
    }
  }

  const optedIn = landlords.filter(l => l.diario_optin)
  const notOptedIn = landlords.filter(l => !l.diario_optin)

  return (
    <div className="space-y-8">
      {/* Opted-in proprietários */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[#2A2A2A]">Recebendo o Diário</h3>
          <span className="text-xs text-[#7A7A6A]">{optedIn.length} proprietário{optedIn.length !== 1 ? "s" : ""}</span>
        </div>

        {optedIn.length === 0 ? (
          <div className="text-center py-8 text-[#7A7A6A] bg-[#F5F0E0] rounded-xl">
            <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum proprietário com Diário ativo</p>
            <p className="text-xs mt-1">Ative para os proprietários listados abaixo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {optedIn.map(l => {
              const lastLog = recentLogs.find(log => log.landlord_id === l.id)
              return (
                <div key={l.id} className="flex items-center gap-3 p-4 bg-white border border-[#D4C5A0] rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#2A2A2A] truncate">{l.name}</p>
                      {l.diario_contact === "whatsapp" ? (
                        <MessageSquare className="w-3 h-3 text-[#787F56]" />
                      ) : (
                        <Mail className="w-3 h-3 text-[#787F56]" />
                      )}
                    </div>
                    {lastLog && (
                      <p className="text-[10px] text-[#7A7A6A] mt-0.5">
                        Último: {new Date(lastLog.sent_at).toLocaleDateString("pt-BR")}
                        {lastLog.content_summary?.weekly_leads !== undefined && (
                          <> · {lastLog.content_summary.weekly_leads} leads, {lastLog.content_summary.weekly_visits ?? 0} visitas</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={l.diario_contact ?? "whatsapp"} onValueChange={v => v && changeChannel(l.id, v)}>
                      <SelectTrigger className="h-7 text-xs border-[#D4C5A0] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-200 text-red-500 hover:bg-red-50 px-2"
                      disabled={updating === l.id}
                      onClick={() => toggleOptin(l.id, true, l.diario_contact)}
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Not opted-in */}
      {notOptedIn.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-[#2A2A2A]">Sem Diário ativo</h3>
            <span className="text-xs text-[#7A7A6A]">{notOptedIn.length} proprietário{notOptedIn.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {notOptedIn.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-4 bg-[#F5F0E0] border border-[#E2D4B9] rounded-xl opacity-75 hover:opacity-100 transition-opacity">
                <User className="w-4 h-4 text-[#7A7A6A] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#4A4A3A] truncate">{l.name}</p>
                  <p className="text-[10px] text-[#7A7A6A]">{l.phone ?? l.email ?? "sem contato"}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-[#787F56] text-[#787F56] hover:bg-[#EEF0E8] shrink-0"
                  disabled={updating === l.id || (!l.phone && !l.email)}
                  onClick={() => toggleOptin(l.id, false, l.diario_contact)}
                >
                  {updating === l.id ? "..." : "Ativar"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-[#2A2A2A]">Últimos envios</h3>
          <div className="space-y-1.5">
            {recentLogs.slice(0, 10).map(log => {
              const landlord = landlords.find(l => l.id === log.landlord_id)
              return (
                <div key={log.id} className="flex items-center gap-3 py-2.5 px-4 bg-white border border-[#D4C5A0] rounded-xl text-sm">
                  <Clock className="w-3.5 h-3.5 text-[#7A7A6A] shrink-0" />
                  <span className="flex-1 text-[#4A4A3A] truncate">{landlord?.name ?? "Proprietário"}</span>
                  <span className="text-xs text-[#7A7A6A]">{new Date(log.sent_at).toLocaleDateString("pt-BR")}</span>
                  {log.opened_at && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
