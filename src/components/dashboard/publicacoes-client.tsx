"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, X, Film, Loader2, Share2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Draft = {
  id: string
  platform: string
  caption?: string | null
  media_url?: string | null
  status: string
  approved_at?: string | null
  created_at: string
  property_id?: string | null
}

const PLATFORM_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  instagram_stories: { label: "Instagram Stories", icon: Share2, color: "text-pink-600" },
  instagram_feed: { label: "Instagram Feed", icon: Share2, color: "text-pink-600" },
  instagram_reels: { label: "Instagram Reels", icon: Film, color: "text-pink-600" },
  facebook_post: { label: "Facebook Post", icon: Share2, color: "text-blue-600" },
  facebook_marketplace: { label: "Marketplace", icon: Share2, color: "text-blue-600" },
  tiktok_reels: { label: "TikTok", icon: Film, color: "text-[#2A2A2A]" },
}

const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Aguardando" },
  { key: "approved", label: "Aprovados" },
  { key: "rejected", label: "Rejeitados" },
]

function DraftCard({ draft, onUpdate }: { draft: Draft; onUpdate: (updated: Draft) => void }) {
  const [acting, setActing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(draft.caption ?? "")
  const platform = PLATFORM_LABELS[draft.platform] ?? { label: draft.platform, icon: Film as LucideIcon, color: "text-[#8A8A8A]" }
  const PlatformIcon = platform.icon

  async function handleAction(status: "approved" | "rejected") {
    setActing(true)
    try {
      const res = await fetch(`/api/social/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, caption: caption || undefined }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate(data)
      toast.success(status === "approved" ? "Post aprovado!" : "Post rejeitado.")
    } catch {
      toast.error("Erro ao atualizar. Tente novamente.")
    } finally {
      setActing(false)
    }
  }

  async function handleSaveCaption() {
    setActing(true)
    try {
      const res = await fetch(`/api/social/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate(data)
      setEditing(false)
      toast.success("Legenda atualizada.")
    } catch {
      toast.error("Erro ao salvar.")
    } finally {
      setActing(false)
    }
  }

  const isPending = draft.status === "pending"
  const isApproved = draft.status === "approved"

  return (
    <div className={cn(
      "bg-white border rounded-xl p-5 space-y-3 transition-all",
      isPending ? "border-[#B87333]/40 shadow-sm" : "border-[#E0D8CE]",
      isApproved && "opacity-80"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformIcon className={cn("w-4 h-4", platform.color)} />
          <span className="text-sm font-medium text-[#2A2A2A]">{platform.label}</span>
        </div>
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full",
          isPending && "bg-[#B87333]/10 text-[#B87333]",
          isApproved && "bg-green-50 text-green-700",
          draft.status === "rejected" && "bg-red-50 text-red-600",
          draft.status === "published" && "bg-[#2D4A3E]/10 text-[#2D4A3E]",
        )}>
          {isPending ? "Aguardando" : isApproved ? "Aprovado" : draft.status === "rejected" ? "Rejeitado" : "Publicado"}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full text-sm border border-[#E0D8CE] rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#2D4A3E]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveCaption} disabled={acting} className="bg-[#2D4A3E] hover:bg-[#1e3329] text-xs">
              {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setCaption(draft.caption ?? ""); setEditing(false) }} className="border-[#E0D8CE] text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-[#5A5A5A] leading-relaxed whitespace-pre-wrap line-clamp-5">
            {draft.caption || <span className="text-[#8A8A8A] italic">Sem legenda</span>}
          </p>
          {isPending && (
            <button onClick={() => setEditing(true)} className="text-xs text-[#B87333] hover:underline mt-1">
              Editar legenda
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#8A8A8A]">
        Gerado em {new Date(draft.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
        {draft.approved_at && ` · Aprovado em ${new Date(draft.approved_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`}
      </p>

      {isPending && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleAction("approved")}
            disabled={acting}
            className="flex-1 bg-[#2D4A3E] hover:bg-[#1e3329] text-xs gap-1"
          >
            {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("rejected")}
            disabled={acting}
            className="flex-1 border-[#E0D8CE] text-[#8A8A8A] hover:text-red-600 hover:border-red-200 text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Rejeitar
          </Button>
        </div>
      )}
    </div>
  )
}

export function PublicacoesClient({ initialDrafts }: { initialDrafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [tab, setTab] = useState("all")

  const filtered = tab === "all" ? drafts : drafts.filter((d) => d.status === tab)

  function handleUpdate(updated: Draft) {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const pendingCount = drafts.filter((d) => d.status === "pending").length

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-[#EAE3D9] rounded-xl p-4 text-sm text-[#5A5A5A]">
        <span className="font-medium text-[#2D4A3E]">Como funciona?</span>{" "}
        Quando você cadastra um imóvel, a Nara gera rascunhos de post para cada rede social.
        Revise a legenda, ajuste se quiser e aprove com um clique. Só o que você aprovar vai para publicação.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EAE3D9] rounded-lg p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === t.key ? "bg-white text-[#2D4A3E] shadow-sm" : "text-[#5A5A5A] hover:text-[#2D4A3E]"
            )}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-[#B87333] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {!filtered.length ? (
        <div className="text-center py-16 text-[#8A8A8A]">
          <Film className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {tab === "pending"
              ? "Nenhum post aguardando aprovação."
              : "Nenhum post encontrado."}
          </p>
          {tab === "all" && (
            <p className="text-xs mt-1">Cadastre um imóvel para que a Nara gere os rascunhos automaticamente.</p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <DraftCard key={d.id} draft={d} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
