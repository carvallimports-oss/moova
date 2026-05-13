"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Share2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RelatorioShareButton() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (shareUrl) {
      copyToClipboard(shareUrl)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/relatorio/share", { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const url = `${window.location.origin}/relatorio/${data.token}`
      setShareUrl(url)
      copyToClipboard(url)
    } catch {
      toast.error("Erro ao gerar link de compartilhamento")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success("Link copiado!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleShare}
        disabled={loading}
        className="bg-[#B87333] hover:bg-[#9A6025] text-white gap-2"
      >
        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        {loading ? "Gerando link..." : copied ? "Link copiado!" : "Compartilhar relatório"}
      </Button>
      {shareUrl && (
        <button
          onClick={() => copyToClipboard(shareUrl)}
          className="flex items-center gap-1.5 text-xs text-[#8A8A8A] hover:text-[#2D4A3E] transition-colors break-all text-center"
        >
          <Copy className="w-3 h-3 shrink-0" />
          {shareUrl}
        </button>
      )}
    </div>
  )
}
