"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Wifi, WifiOff, RefreshCw, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type Profile = {
  name: string
  creci: string
  phone: string
  whatsapp_provider: string
  cora_formality: string
  cora_custom_prompt: string | null
  human_approval_active: boolean
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
  const [formality, setFormality] = useState(profile?.cora_formality ?? "informal")
  const [customPrompt, setCustomPrompt] = useState(profile?.cora_custom_prompt ?? "")
  const [humanApproval, setHumanApproval] = useState(profile?.human_approval_active ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from("users")
      .update({
        cora_formality: formality,
        cora_custom_prompt: customPrompt || null,
        human_approval_active: humanApproval,
      })
      .eq("id", user!.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const waConnected = waAccount?.status === "connected"

  return (
    <div className="space-y-6">
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
            <Button className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2">
              <RefreshCw className="w-4 h-4" />
              Conectar WhatsApp (QR Code)
            </Button>
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
            <p className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3">
              Obrigatório nos primeiros 30 dias. Você pode desativar por categoria após o período de calibragem.
            </p>
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
