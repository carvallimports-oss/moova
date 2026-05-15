"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Wifi, WifiOff, RefreshCw, Shield, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type HumanApprovalCategories = {
  visita: boolean
  valor: boolean
  contraproposta: boolean
  fechamento: boolean
  alto_valor: boolean
}

type Profile = {
  name: string
  creci: string
  phone: string
  whatsapp_provider: string
  cora_formality: string
  cora_custom_prompt: string | null
  human_approval_active: boolean
  human_approval_categories: HumanApprovalCategories | null
} | null

type WAAccount = {
  status: string
  phone_number: string | null
  provider: string
} | null

export function ConfiguracoesForm({
  profile,
  waAccount,
}: {
  profile: Profile
  waAccount: WAAccount
}) {
  const supabase = createClient()
  const [name, setName] = useState(profile?.name ?? "")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [creci, setCreci] = useState(profile?.creci ?? "")
  const [formality, setFormality] = useState(profile?.cora_formality ?? "informal")
  const [customPrompt, setCustomPrompt] = useState(profile?.cora_custom_prompt ?? "")
  const [humanApproval, setHumanApproval] = useState(profile?.human_approval_active ?? true)
  const [approvalCategories, setApprovalCategories] = useState<HumanApprovalCategories>(
    profile?.human_approval_categories ?? {
      visita: true, valor: true, contraproposta: true, fechamento: true, alto_valor: true,
    }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(waAccount?.status === "connected")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setQrCode(null)
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const qr = data.qr as string | null
      if (qr) {
        const src = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`
        setQrCode(src)
        pollRef.current = setInterval(async () => {
          const statusRes = await fetch("/api/whatsapp/status")
          if (!statusRes.ok) return
          const status = await statusRes.json()
          if (status.connected) {
            setConnected(true)
            setQrCode(null)
            if (pollRef.current) clearInterval(pollRef.current)
            toast.success("WhatsApp conectado!")
          }
        }, 4000)
      } else {
        toast.error("QR Code não disponível. Tente novamente.")
      }
    } catch {
      toast.error("Erro ao conectar WhatsApp")
    } finally {
      setConnecting(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from("users")
        .update({
          name: name || undefined,
          broker_name: name || undefined,
          phone: phone || undefined,
          creci: creci || undefined,
          cora_formality: formality,
          cora_custom_prompt: customPrompt || null,
          human_approval_active: humanApproval,
          human_approval_categories: approvalCategories,
        })
        .eq("id", user!.id)
      setSaved(true)
      toast.success("Configurações salvas")
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const waConnected = connected

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E]">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="João da Silva" className="border-[#E0D8CE]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>WhatsApp (com DDD)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="11 99999-9999" className="border-[#E0D8CE]" />
            </div>
            <div className="space-y-1.5">
              <Label>CRECI</Label>
              <Input value={creci} onChange={(e) => setCreci(e.target.value)}
                placeholder="123456-SP" className="border-[#E0D8CE]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
            {waConnected
              ? <Wifi className="w-4 h-4 text-green-600" />
              : <WifiOff className="w-4 h-4 text-[#8A8A8A]" />
            }
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#2A2A2A]">
                {waConnected ? waAccount?.phone_number ?? "Conectado" : "Não conectado"}
              </p>
              <p className="text-xs text-[#8A8A8A] mt-0.5">
                Provider: {waAccount?.provider ?? profile?.whatsapp_provider ?? "evolution"}
              </p>
            </div>
            <Badge className={cn(
              "text-xs",
              waConnected
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            )}>
              {waConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>

          {!waConnected && (
            <div className="space-y-3">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {connecting ? "Gerando QR Code..." : "Conectar WhatsApp (QR Code)"}
              </Button>
              {qrCode && (
                <div className="flex flex-col items-center gap-2 p-4 bg-white border border-[#E0D8CE] rounded-xl">
                  <p className="text-xs text-[#5A5A5A] font-medium">Escaneie com o WhatsApp</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  <p className="text-[11px] text-[#8A8A8A]">Abrindo WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3 space-y-1">
            <p className="font-medium text-[#5A5A5A]">Plano atual: Evolution API — R$ 799/mês</p>
            <p>Migração para BSP oficial (selo verde Meta) disponível no plano R$ 1.199/mês.</p>
          </div>
        </CardContent>
      </Card>

      {/* Tom da Cora */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E]">Tom da Cora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm text-[#2A2A2A]">Estilo de comunicação</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "formal", label: "Formal", ex: '"Bom dia, Sr. Carlos. Confirmo a visita?"' },
                { key: "informal", label: "Informal", ex: '"Oi Carlos! Confirma a visita amanhã?"' },
              ].map(({ key, label, ex }) => (
                <button
                  key={key}
                  onClick={() => setFormality(key)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all",
                    formality === key
                      ? "border-[#2D4A3E] bg-[#2D4A3E]/5"
                      : "border-[#E0D8CE] hover:border-[#2D4A3E]/40"
                  )}
                >
                  <p className="text-sm font-medium text-[#2A2A2A]">{label}</p>
                  <p className="text-xs text-[#8A8A8A] mt-1 italic">{ex}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-[#2A2A2A]">Instruções extras para a Cora (opcional)</Label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Sempre mencione que trabalhamos com financiamento Caixa. Foque em imóveis de alto padrão."
              rows={3}
              className="w-full text-sm border border-[#E0D8CE] rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:border-[#2D4A3E] text-[#2A2A2A] placeholder:text-[#8A8A8A]"
            />
            <p className="text-xs text-[#8A8A8A]">O piso de identidade da Cora Constitution nunca é alterado.</p>
          </div>
        </CardContent>
      </Card>

      {/* Aprovação humana */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Aprovação Humana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#2A2A2A]">Aprovar mensagens críticas manualmente</p>
              <p className="text-xs text-[#8A8A8A] mt-0.5">
                Proposta de visita, valores, contrapropostas, fechamentos
              </p>
            </div>
            <button
              onClick={() => setHumanApproval(!humanApproval)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                humanApproval ? "bg-[#2D4A3E]" : "bg-[#E0D8CE]"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all",
                humanApproval ? "left-[22px]" : "left-0.5"
              )} />
            </button>
          </div>
          {humanApproval && (
            <div className="space-y-3">
              <p className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3">
                Obrigatório nos primeiros 30 dias. Após a calibragem, você pode desativar por categoria.
              </p>
              <div className="space-y-2">
                {(Object.entries(approvalCategories) as [keyof HumanApprovalCategories, boolean][]).map(([cat, active]) => {
                  const labels: Record<keyof HumanApprovalCategories, string> = {
                    visita: "Proposta de visita",
                    valor: "Envio de preço / valor",
                    contraproposta: "Contraproposta",
                    fechamento: "Confirmação de fechamento",
                    alto_valor: "Leads com budget acima de R$ 50k",
                  }
                  return (
                    <div key={cat} className="flex items-center justify-between py-1">
                      <span className="text-xs text-[#5A5A5A]">{labels[cat]}</span>
                      <button
                        onClick={() => setApprovalCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative shrink-0",
                          active ? "bg-[#2D4A3E]" : "bg-[#E0D8CE]"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all",
                          active ? "left-[18px]" : "left-0.5"
                        )} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-[#E0D8CE]" />

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm min-w-[140px]"
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  )
}
