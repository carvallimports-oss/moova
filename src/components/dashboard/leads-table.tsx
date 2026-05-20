"use client"

import { useState, useMemo } from "react"
import { LeadModal } from "@/components/dashboard/lead-modal"
import type { Lead } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, Phone, MapPin, Plus, Star } from "lucide-react"

type TableLead = {
  id: string
  name: string
  phone: string
  status: string
  temperature: string | null
  estimated_budget: number | null
  region: string | null
  last_contact_at: string | null
  next_action: string | null
  is_vip: boolean
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  em_consideracao: "Em consideração",
  visita_agendada: "Visita agendada",
  visitou: "Visitou",
  em_negociacao: "Em negociação",
  fechou: "Fechou",
  perdido: "Perdido",
}

const TEMP_COLORS: Record<string, string> = {
  QUENTE: "bg-red-50 text-red-700 border-red-200",
  MORNO: "bg-orange-50 text-orange-700 border-orange-200",
  FRIO: "bg-blue-50 text-blue-700 border-blue-200",
  INERTE: "bg-gray-50 text-gray-500 border-gray-200",
}

const ALL_STATUSES = ["all", ...Object.keys(STATUS_LABELS)]
const ALL_TEMPS = ["all", "QUENTE", "MORNO", "FRIO", "INERTE"]

type SortKey = "name" | "status" | "temperature" | "estimated_budget" | "created_at"

export function LeadsTable({ initialLeads }: { initialLeads: TableLead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [statusFilter, setStatusFilter] = useState("all")
  const [tempFilter, setTempFilter] = useState("all")
  const [vipOnly, setVipOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openCreate() {
    setSelectedLead(null)
    setModalOpen(true)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((a) => !a)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const filtered = useMemo(() => {
    let list = leads
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter)
    if (tempFilter !== "all") list = list.filter((l) => l.temperature === tempFilter)
    if (vipOnly) list = list.filter((l) => l.is_vip)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q))
    }
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ""
      let bv: string | number = b[sortKey] ?? ""
      if (sortKey === "estimated_budget") {
        av = Number(av)
        bv = Number(bv)
      }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [leads, statusFilter, tempFilter, vipOnly, search, sortKey, sortAsc])

  function handleSaved(updated: Lead) {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...updated }
        return next
      }
      return [updated as unknown as TableLead, ...prev]
    })
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-20" />
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#7A7A6A]">{leads.length} leads no total</p>
        <Button onClick={openCreate} className="bg-[#30360E] hover:bg-[#4A5218] text-white text-sm gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Novo lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 text-sm border border-[#D4C5A0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#30360E] text-[#2A2A2A] placeholder:text-[#7A7A6A]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-[#D4C5A0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#30360E] text-[#4A4A3A]"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={tempFilter}
          onChange={(e) => setTempFilter(e.target.value)}
          className="text-sm border border-[#D4C5A0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#30360E] text-[#4A4A3A]"
        >
          <option value="all">Todas as temperaturas</option>
          {ALL_TEMPS.slice(1).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={() => setVipOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            vipOnly
              ? "border-[#787F56] bg-[#787F56]/10 text-[#787F56]"
              : "border-[#D4C5A0] bg-white text-[#4A4A3A] hover:border-[#787F56]/40"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          VIP
        </button>
      </div>

      {/* Table */}
      <div className="border border-[#D4C5A0] rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D4C5A0] bg-[#F5F0E0]">
                {([
                  ["name", "Nome"],
                  ["status", "Status"],
                  ["temperature", "Temperatura"],
                  ["estimated_budget", "Budget"],
                  ["created_at", "Cadastro"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-4 py-3 text-xs font-medium text-[#4A4A3A] uppercase tracking-wide cursor-pointer hover:text-[#30360E] select-none"
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <SortIcon k={key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D4B9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7A7A6A]">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead as unknown as Lead)
                      setModalOpen(true)
                    }}
                    className="hover:bg-[#F5F0E0] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#2A2A2A]">{lead.name}</p>
                          {lead.is_vip && (
                            <Star className="w-3 h-3 text-[#787F56] fill-[#787F56] shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-[#7A7A6A]">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                          {lead.region && (
                            <span className="flex items-center gap-1 text-xs text-[#7A7A6A]">
                              <MapPin className="w-3 h-3" />
                              {lead.region}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#4A4A3A]">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.temperature ? (
                        <Badge className={cn("text-[10px] border px-1.5 py-0", TEMP_COLORS[lead.temperature] ?? "")}>
                          {lead.temperature}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[#7A7A6A]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.estimated_budget ? (
                        <span className="text-xs text-[#787F56] font-medium">
                          R$ {lead.estimated_budget.toLocaleString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-xs text-[#7A7A6A]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#7A7A6A]">
                      {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {lead.next_action && (
                        <span className="text-[11px] text-[#4A4A3A] bg-[#E2D4B9] px-2 py-1 rounded whitespace-nowrap">
                          {lead.next_action}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[#E2D4B9] bg-[#F5F0E0] text-xs text-[#7A7A6A]">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== leads.length && ` de ${leads.length}`}
          </div>
        )}
      </div>

      <LeadModal
        key={selectedLead?.id ?? "new"}
        lead={selectedLead}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
