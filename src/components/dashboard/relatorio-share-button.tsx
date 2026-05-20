"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Share2, Copy, Check, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RelatorioShareButton() {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function ensureToken(): Promise<string | null> {
    if (shareToken) return shareToken
    setLoading(true)
    try {
      const res = await fetch("/api/relatorio/share", { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const token = data.token as string
      const url = `${window.location.origin}/relatorio/${token}`
      setShareToken(token)
      setShareUrl(url)
      return token
    } catch {
      toast.error("Erro ao gerar link de compartilhamento")
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    const token = await ensureToken()
    if (!token) return
    const url = `${window.location.origin}/relatorio/${token}`
    copyToClipboard(url)
  }

  async function handleStory() {
    const token = await ensureToken()
    if (!token) return
    window.open(`/relatorio/${token}/story`, "_blank")
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <Button
          onClick={handleShare}
          disabled={loading}
          className="bg-[#787F56] hover:bg-[#9A6025] text-white gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {loading ? "Gerando..." : copied ? "Copiado!" : "Compartilhar"}
        </Button>
        <Button
          onClick={handleStory}
          disabled={loading}
          variant="outline"
          className="border-[#30360E] text-[#30360E] hover:bg-[#30360E] hover:text-white gap-2"
        >
          <Camera className="w-4 h-4" />
          Stories 9:16
        </Button>
      </div>
      {shareUrl && (
        <button
          onClick={() => copyToClipboard(shareUrl)}
          className="flex items-center gap-1.5 text-xs text-[#7A7A6A] hover:text-[#30360E] transition-colors break-all text-center"
        >
          <Copy className="w-3 h-3 shrink-0" />
          {shareUrl}
        </button>
      )}
    </div>
  )
}
