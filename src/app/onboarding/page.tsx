"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

const STEPS = [
  { id: 1, label: "Seus dados" },
  { id: 2, label: "CRECI" },
  { id: 3, label: "LGPD" },
  { id: 4, label: "WhatsApp" },
]

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [lgpdAccepted, setLgpdAccepted] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    creci: "",
    creci_state: "SP",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleStep1() {
    if (!form.name || !form.phone) return
    setStep(2)
  }

  async function handleStep2() {
    if (!form.creci || !form.creci_state) return
    setStep(3)
  }

  async function handleStep3() {
    if (!lgpdAccepted) return
    setStep(4)
  }

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("users").upsert({
      id: user.id,
      email: user.email!,
      name: form.name,
      phone: form.phone,
      creci: form.creci,
      creci_state: form.creci_state,
      creci_validation_status: "pending",
    })

    await supabase.from("compliance_consents").insert({
      user_id: user.id,
      type: "broker_terms",
    })

    await supabase.from("creci_validations").insert({
      user_id: user.id,
      creci: form.creci,
      state: form.creci_state,
      status: "pending",
      source: "scraping",
    })

    // Cria registro de diagnóstico inicial
    await supabase.from("diagnostico_cora_14d").insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })

    router.push("/dashboard/configuracoes")
    setLoading(false)
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
          <h1 className="font-serif text-3xl text-[#2D4A3E]">Bem-vindo à Moova</h1>
          <p className="text-sm text-[#8A8A8A]">Configure sua conta em 4 passos</p>
        </div>

        {/* Steps indicator */}
        <div className="space-y-3">
          <Progress value={pct} className="h-1 bg-[#E0D8CE]" />
          <div className="flex justify-between">
            {STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step > s.id
                    ? "bg-[#2D4A3E] text-white"
                    : step === s.id
                    ? "bg-[#B87333] text-white"
                    : "bg-[#E0D8CE] text-[#8A8A8A]"
                )}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-[10px] text-[#8A8A8A] hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-[#E0D8CE]">
          <CardContent className="p-6 space-y-5">
            {/* Step 1 — Dados */}
            {step === 1 && (
              <>
                <h2 className="font-serif text-xl text-[#2D4A3E]">Seus dados</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input value={form.name} onChange={(e) => update("name", e.target.value)}
                      placeholder="João da Silva" className="border-[#E0D8CE]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp (com DDD)</Label>
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                      placeholder="11 99999-9999" className="border-[#E0D8CE]" />
                  </div>
                </div>
                <Button onClick={handleStep1} disabled={!form.name || !form.phone}
                  className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                  Continuar
                </Button>
              </>
            )}

            {/* Step 2 — CRECI */}
            {step === 2 && (
              <>
                <h2 className="font-serif text-xl text-[#2D4A3E]">Registro CRECI</h2>
                <p className="text-sm text-[#8A8A8A]">
                  Validamos seu CRECI para garantir que apenas corretores ativos usam a Moova.
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Número do CRECI</Label>
                    <Input value={form.creci} onChange={(e) => update("creci", e.target.value)}
                      placeholder="123456" className="border-[#E0D8CE]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Input value={form.creci_state} onChange={(e) => update("creci_state", e.target.value)}
                      placeholder="SP" maxLength={2} className="border-[#E0D8CE] uppercase" />
                  </div>
                </div>
                <div className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3">
                  A validação do CRECI é feita em até 24h úteis. Você pode continuar a configuração enquanto aguarda.
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-[#E0D8CE]">
                    Voltar
                  </Button>
                  <Button onClick={handleStep2} disabled={!form.creci}
                    className="flex-1 bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 3 — LGPD */}
            {step === 3 && (
              <>
                <h2 className="font-serif text-xl text-[#2D4A3E]">Termos e LGPD</h2>
                <div className="text-sm text-[#5A5A5A] space-y-3 max-h-48 overflow-y-auto bg-[#EAE3D9] rounded-lg p-4">
                  <p className="font-medium text-[#2D4A3E]">Termo de Uso e Privacidade — Moova</p>
                  <p>Ao usar a Moova, você autoriza que a Cora atenda seus leads via WhatsApp em seu nome, sempre com disclaimer automático ao lead informando que é uma IA.</p>
                  <p>Seus leads têm direito a: pedir atendimento humano (escalação imediata), opt-out instantâneo, exclusão de dados em 15 dias, portabilidade em 15 dias.</p>
                  <p>Todos os dados são armazenados com criptografia e logs auditáveis por 5 anos, conforme LGPD.</p>
                  <p>Leia o contrato completo em moova.com.br/termos.</p>
                </div>
                <button
                  onClick={() => setLgpdAccepted(!lgpdAccepted)}
                  className="flex items-start gap-3 w-full text-left"
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                    lgpdAccepted ? "bg-[#2D4A3E] border-[#2D4A3E]" : "border-[#E0D8CE]"
                  )}>
                    {lgpdAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-[#5A5A5A]">
                    Li e aceito os Termos de Uso, Política de Privacidade e autorizo o uso de IA no atendimento dos meus leads.
                  </span>
                </button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-[#E0D8CE]">Voltar</Button>
                  <Button onClick={handleStep3} disabled={!lgpdAccepted}
                    className="flex-1 bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                    Aceitar e continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 4 — WhatsApp */}
            {step === 4 && (
              <>
                <h2 className="font-serif text-xl text-[#2D4A3E]">Conectar WhatsApp</h2>
                <p className="text-sm text-[#8A8A8A]">
                  A Cora vai atender seus leads pelo seu número do WhatsApp.
                </p>
                <div className="bg-[#EAE3D9] rounded-xl p-6 text-center space-y-3">
                  <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center border border-[#E0D8CE]">
                    <p className="text-xs text-[#8A8A8A]">QR Code<br/>aparece aqui</p>
                  </div>
                  <p className="text-xs text-[#5A5A5A]">
                    Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escanear QR Code
                  </p>
                </div>
                <div className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3">
                  Plano atual: <strong className="text-[#2D4A3E]">Evolution API — R$ 799/mês</strong>.
                  O WhatsApp permanece no seu celular normalmente.
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-[#E0D8CE]">Voltar</Button>
                  <Button onClick={handleFinish} disabled={loading}
                    className="flex-1 bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                    {loading ? "Criando conta..." : "Conectar depois →"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
