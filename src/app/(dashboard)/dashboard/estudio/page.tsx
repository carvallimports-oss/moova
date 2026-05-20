"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, Loader2, ImageIcon, ArrowRight, Info, Upload, Link2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Tab = "fotos" | "video" | "tour360"
type InputMode = "upload" | "url"

export default function EstudioPage() {
  const [tab, setTab] = useState<Tab>("fotos")
  const [inputMode, setInputMode] = useState<InputMode>("upload")
  const [imageUrl, setImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [originalUrl, setOriginalUrl] = useState("")
  const [enhancedUrl, setEnhancedUrl] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File): Promise<string | null> {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.")
      return null
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB.")
      return null
    }
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/studio/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? "Erro no upload."); return null }
    return data.url as string
  }

  async function handleFileSelect(file: File) {
    setUploading(true)
    setOriginalUrl("")
    setEnhancedUrl("")
    try {
      const url = await uploadFile(file)
      if (url) {
        setImageUrl(url)
        toast.success("Foto carregada. Clique em Melhorar para processar.")
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEnhance() {
    if (!imageUrl.trim()) { toast.error("Selecione ou cole a URL de uma foto."); return }
    setEnhancing(true)
    setOriginalUrl(imageUrl)
    setEnhancedUrl("")
    try {
      const res = await fetch("/api/studio/enhance-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Erro ao processar foto."); return }
      setEnhancedUrl(data.enhanced_url)
      toast.success("Foto melhorada com sucesso.")
    } catch {
      toast.error("Erro ao processar. Tente novamente.")
    } finally {
      setEnhancing(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-[#787F56]" />
          <h1 className="font-serif text-2xl text-[#30360E]">Moova Estúdio</h1>
        </div>
        <p className="text-sm text-[#7A7A6A]">Marketing visual com IA — fotos, vídeos e tour 360 para seus imóveis.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#E2D4B9] p-1 rounded-lg w-fit">
        {[
          { key: "fotos", label: "Fotos IA" },
          { key: "video", label: "Vídeo Reel" },
          { key: "tour360", label: "Tour 360" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === t.key ? "bg-white text-[#30360E] shadow-sm" : "text-[#4A4A3A] hover:text-[#30360E]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fotos" && (
        <div className="space-y-5">
          <div className="bg-white border border-[#D4C5A0] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#30360E]">Melhorar foto com IA</h2>
              {/* Input mode toggle */}
              <div className="flex gap-1 bg-[#E2D4B9] p-0.5 rounded-lg">
                <button
                  onClick={() => { setInputMode("upload"); setImageUrl("") }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    inputMode === "upload" ? "bg-white text-[#30360E] shadow-sm" : "text-[#4A4A3A] hover:text-[#30360E]"
                  )}
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
                <button
                  onClick={() => { setInputMode("url"); setImageUrl("") }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    inputMode === "url" ? "bg-white text-[#30360E] shadow-sm" : "text-[#4A4A3A] hover:text-[#30360E]"
                  )}
                >
                  <Link2 className="w-3 h-3" />
                  URL
                </button>
              </div>
            </div>

            {inputMode === "upload" ? (
              <div className="space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                    dragOver
                      ? "border-[#30360E] bg-[#F0F7F4]"
                      : "border-[#D4C5A0] hover:border-[#787F56] hover:bg-[#F5F0E0]",
                    uploading && "pointer-events-none opacity-60"
                  )}
                >
                  {uploading ? (
                    <div className="space-y-2">
                      <Loader2 className="w-8 h-8 text-[#787F56] animate-spin mx-auto" />
                      <p className="text-sm text-[#4A4A3A]">Carregando foto...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-[#787F56] mx-auto opacity-60" />
                      <p className="text-sm font-medium text-[#30360E]">Clique para selecionar ou arraste aqui</p>
                      <p className="text-xs text-[#7A7A6A]">JPG, PNG ou WebP — máximo 20MB</p>
                    </div>
                  )}
                </div>
                {imageUrl && !uploading && (
                  <div className="flex items-center gap-2 bg-[#F0F7F4] rounded-lg px-3 py-2">
                    <ImageIcon className="w-4 h-4 text-[#30360E] shrink-0" />
                    <p className="text-xs text-[#30360E] truncate flex-1">Foto carregada com sucesso</p>
                    <Button
                      onClick={handleEnhance}
                      disabled={enhancing}
                      size="sm"
                      className="bg-[#30360E] hover:bg-[#20240A] gap-1.5 text-xs shrink-0"
                    >
                      {enhancing ? <><Loader2 className="w-3 h-3 animate-spin" /> Processando...</> : <><Wand2 className="w-3 h-3" /> Melhorar</>}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#4A4A3A]">
                  Cole a URL de uma foto do imóvel. A IA fará upscaling 2× e melhorará nitidez, cores e qualidade geral.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#4A4A3A]">URL da foto original</label>
                  <div className="flex gap-2">
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto-imovel.jpg"
                      className="flex-1 border border-[#D4C5A0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#30360E]/20"
                    />
                    <Button
                      onClick={handleEnhance}
                      disabled={enhancing || !imageUrl.trim()}
                      className="bg-[#30360E] hover:bg-[#20240A] gap-2 shrink-0"
                    >
                      {enhancing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Wand2 className="w-4 h-4" /> Melhorar</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 bg-[#F5F0E0] rounded-lg p-3">
              <Info className="w-4 h-4 text-[#787F56] shrink-0 mt-0.5" />
              <p className="text-xs text-[#4A4A3A]">
                Upscaling 2× com Real-ESRGAN. O processamento leva 20-60 segundos.
                Requer <code className="bg-[#E2D4B9] px-1 rounded">REPLICATE_API_KEY</code> configurada no ambiente.
              </p>
            </div>
          </div>

          {(originalUrl || enhancedUrl) && (
            <div className="bg-white border border-[#D4C5A0] rounded-xl p-6 space-y-4">
              <h2 className="font-serif text-lg text-[#30360E]">Resultado</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#7A7A6A] uppercase tracking-wide">Original</p>
                  <div className="aspect-video bg-[#F5F5F5] rounded-lg overflow-hidden">
                    {originalUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={originalUrl} alt="Original" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[#7A7A6A] uppercase tracking-wide">Melhorada</p>
                    {enhancing && <Loader2 className="w-3 h-3 text-[#787F56] animate-spin" />}
                  </div>
                  <div className="aspect-video bg-[#F5F5F5] rounded-lg overflow-hidden flex items-center justify-center">
                    {enhancedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={enhancedUrl} alt="Melhorada" className="w-full h-full object-cover" />
                    ) : enhancing ? (
                      <div className="text-center space-y-2">
                        <Loader2 className="w-8 h-8 text-[#787F56] animate-spin mx-auto" />
                        <p className="text-xs text-[#7A7A6A]">Processando com Real-ESRGAN...</p>
                      </div>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[#D4C5A0]" />
                    )}
                  </div>
                </div>
              </div>
              {enhancedUrl && (
                <a
                  href={enhancedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#787F56] hover:underline flex items-center gap-1"
                >
                  Abrir foto melhorada <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="bg-white border border-[#D4C5A0] rounded-xl p-6">
            <h3 className="font-serif text-base text-[#30360E] mb-3">Dicas para melhores resultados</h3>
            <ul className="space-y-2">
              {[
                "Use fotos tiradas com boa iluminação natural — a IA amplifica o que está lá",
                "Fotos de no mínimo 800×600px têm melhor resultado final",
                "Evite fotos com muito movimento (motion blur) — o upscaling não corrige isso",
                "Para remover objetos indesejados, use ferramentas de inpainting como Adobe Firefly",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-[#4A4A3A]">
                  <span className="text-[#787F56] mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "video" && (
        <div className="bg-white border border-[#D4C5A0] rounded-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-[#E2D4B9] rounded-full flex items-center justify-center mx-auto">
            <Wand2 className="w-8 h-8 text-[#787F56]" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-[#30360E] mb-2">Moova Reel — Em breve</h2>
            <p className="text-sm text-[#4A4A3A] leading-relaxed max-w-sm mx-auto">
              Stack de vídeo proprietário (FFmpeg + IA + música licenciada) está em desenvolvimento.
              Reels de 15-30s a partir das fotos do imóvel, prontos para publicar no Instagram e TikTok.
            </p>
          </div>
          <div className="bg-[#F5F0E0] rounded-lg p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-[#30360E]">O que vai incluir</p>
            {[
              "Reel automático de 15-30s a partir de 5-10 fotos",
              "Música licenciada (Epidemic Sound — sem copyright)",
              "Texto animado com preço, localização e chamada",
              "Custo marginal R$ 1-3 por reel",
            ].map((f) => (
              <p key={f} className="text-sm text-[#4A4A3A] flex items-start gap-2">
                <span className="text-[#787F56] shrink-0">→</span>{f}
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === "tour360" && (
        <div className="bg-white border border-[#D4C5A0] rounded-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-[#E2D4B9] rounded-full flex items-center justify-center mx-auto">
            <Wand2 className="w-8 h-8 text-[#787F56]" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-[#30360E] mb-2">Tour 360° — Em breve</h2>
            <p className="text-sm text-[#4A4A3A] leading-relaxed max-w-sm mx-auto">
              Tour 360° simples gerado a partir de 6-8 fotos do celular com stitching por IA.
              Custo estimado R$ 5-10 por imóvel.
            </p>
          </div>
          <div className="bg-[#F5F0E0] rounded-lg p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-[#30360E]">O que vai incluir</p>
            {[
              "Tour interativo navegável no navegador",
              "Link compartilhável para WhatsApp e portais",
              "Realsee como opção premium (Maestria)",
              "Sem equipamento especial — só o celular",
            ].map((f) => (
              <p key={f} className="text-sm text-[#4A4A3A] flex items-start gap-2">
                <span className="text-[#787F56] shrink-0">→</span>{f}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
