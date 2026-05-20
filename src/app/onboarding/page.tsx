"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { CheckCircle2, Loader2, RefreshCw, AlertTriangle, Mic, MicOff } from "lucide-react"
import { toast } from "sonner"

const STEPS = [
  { id: 1, label: "Seus dados" },
  { id: 2, label: "CRECI" },
  { id: 3, label: "Comprovante" },
  { id: 4, label: "LGPD" },
  { id: 5, label: "WhatsApp" },
  { id: 6, label: "Voz" },
]

const VOICE_PROMPTS = [
  "Olá! Sou a Nara, assistente do corretor pelo Moova. Como posso ajudar?",
  "Ótimo! Vou verificar as informações desse imóvel para você agora mesmo.",
  "Que excelente escolha! Podemos agendar uma visita amanhã às 10h?",
  "Perfeito. Vou passar todas as informações para o corretor agora.",
  "Qualquer dúvida é só perguntar. Estou aqui para ajudar!",
]

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [lgpdAccepted, setLgpdAccepted] = useState(false)
  const [capFull, setCapFull] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    cpf: "",
    creci: "",
    creci_state: "SP",
  })
  const [saleProofFile, setSaleProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const saleProofRef = useRef<HTMLInputElement>(null)

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const [waConnected, setWaConnected] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Voice cloning state
  const [voiceLgpdAccepted, setVoiceLgpdAccepted] = useState(false)
  const [recordings, setRecordings] = useState<(string | null)[]>([null, null, null, null, null])
  const [activeRecording, setActiveRecording] = useState<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [cloningVoice, setCloningVoice] = useState(false)
  const [voiceCloned, setVoiceCloned] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
  }, [])

  // Verificar cap de 30 corretores
  useEffect(() => {
    async function checkCap() {
      const { count } = await supabase
        .from("diagnostico_nara_14d")
        .select("id", { count: "exact", head: true })
        .eq("converted_to_subscription", false)
        .gt("ends_at", new Date().toISOString())
      setCapFull((count ?? 0) >= 30)
    }
    checkCap()
  }, [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleStep1() {
    if (!form.name || !form.phone || !form.cpf) return
    setStep(2)
  }

  function handleStep2() {
    if (!form.creci || !form.creci_state) return
    setStep(3)
  }

  async function handleStep3() {
    setUploadingProof(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (saleProofFile && user) {
        const ext = saleProofFile.name.split(".").pop()
        const path = `${user.id}/comprovante.${ext}`
        const { data: uploaded } = await supabase.storage
          .from("sale-proofs")
          .upload(path, saleProofFile, { upsert: true })
        if (uploaded) {
          const { data: { publicUrl } } = supabase.storage.from("sale-proofs").getPublicUrl(path)
          await supabase.from("users").upsert({ id: user.id, email: user.email!, name: form.name || "Corretor", creci: form.creci, creci_state: form.creci_state, phone: form.phone, sale_proof_url: publicUrl })
        }
      }
    } finally {
      setUploadingProof(false)
    }
    setStep(4)
  }

  function handleStep4() {
    if (!lgpdAccepted) return
    setStep(5)
  }

  async function startVoiceRecording(index: number) {
    if (activeRecording !== null) stopVoiceRecording()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : ""
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" })
        const reader = new FileReader()
        reader.onloadend = () => {
          setRecordings((prev) => { const next = [...prev]; next[index] = reader.result as string; return next })
        }
        reader.readAsDataURL(blob)
        setActiveRecording(null)
        setRecordingTime(0)
        if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null }
      }
      setActiveRecording(index)
      recorder.start()
      let secs = 0
      voiceTimerRef.current = setInterval(() => {
        secs++
        setRecordingTime(secs)
        if (secs >= 30) stopVoiceRecording()
      }, 1000)
    } catch {
      toast.error("Permissão de microfone negada")
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null }
    setRecordingTime(0)
  }

  async function handleCloneVoice() {
    const valid = recordings.filter(Boolean) as string[]
    if (valid.length < 2) return
    setCloningVoice(true)
    try {
      const res = await fetch("/api/voice/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audios: valid }),
      })
      if (!res.ok) throw new Error()
      setVoiceCloned(true)
      toast.success("Voz personalizada criada!")
    } catch {
      toast.error("Erro ao clonar voz. Tente novamente.")
    } finally {
      setCloningVoice(false)
    }
  }

  async function handleConnectWA() {
    setWaConnecting(true)
    setQrCode(null)
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao conectar WhatsApp")
        return
      }
      const qr = data.qr as string | null
      if (qr) {
        const src = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`
        setQrCode(src)
        pollRef.current = setInterval(async () => {
          const statusRes = await fetch("/api/whatsapp/status")
          if (!statusRes.ok) return
          const status = await statusRes.json()
          if (status.connected) {
            setWaConnected(true)
            setQrCode(null)
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }, 4000)
      }
    } finally {
      setWaConnecting(false)
    }
  }

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("users").upsert({
      id: user.id,
      email: user.email!,
      name: form.name,
      broker_name: form.name,
      phone: form.phone,
      cpf: form.cpf,
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

    await supabase.from("diagnostico_nara_14d").insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })

    router.push("/dashboard/configuracoes")
    setLoading(false)
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  if (capFull) {
    return (
      <div className="min-h-screen bg-[#F5F0E0] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-8 h-1 bg-[#787F56] rounded-full mx-auto" />
          <h1 className="font-serif text-2xl text-[#30360E]">Lista de espera</h1>
          <div className="bg-[#E2D4B9] rounded-2xl p-8 space-y-3">
            <AlertTriangle className="w-8 h-8 text-[#787F56] mx-auto" />
            <p className="text-[#4A4A3A] text-sm leading-relaxed">
              No momento estamos com o cap de 30 corretores simultâneos preenchido.
              Seu cadastro foi registrado e você será o próximo na fila quando uma vaga abrir.
            </p>
            <p className="text-xs text-[#7A7A6A]">
              Você receberá um email quando sua vaga estiver disponível.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-8 h-1 bg-[#787F56] rounded-full mx-auto" />
          <h1 className="font-serif text-3xl text-[#30360E]">Bem-vindo à Moova</h1>
          <p className="text-sm text-[#7A7A6A]">Configure sua conta</p>
        </div>

        <div className="space-y-3">
          <Progress value={pct} className="h-1 bg-[#D4C5A0]" />
          <div className="flex justify-between">
            {STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step > s.id
                    ? "bg-[#30360E] text-white"
                    : step === s.id
                    ? "bg-[#787F56] text-white"
                    : "bg-[#D4C5A0] text-[#7A7A6A]"
                )}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-[10px] text-[#7A7A6A] hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-[#D4C5A0]">
          <CardContent className="p-6 space-y-5">
            {/* Step 1 — Dados */}
            {step === 1 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Seus dados</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input value={form.name} onChange={(e) => update("name", e.target.value)}
                      placeholder="João da Silva" className="border-[#D4C5A0]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => update("cpf", e.target.value)}
                      placeholder="000.000.000-00" className="border-[#D4C5A0]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp (com DDD)</Label>
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                      placeholder="11 99999-9999" className="border-[#D4C5A0]" />
                  </div>
                </div>
                <Button onClick={handleStep1} disabled={!form.name || !form.phone || !form.cpf}
                  className="w-full bg-[#30360E] hover:bg-[#4A5218] text-white">
                  Continuar
                </Button>
              </>
            )}

            {/* Step 2 — CRECI */}
            {step === 2 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Registro CRECI</h2>
                <p className="text-sm text-[#7A7A6A]">
                  Validamos seu CRECI para garantir que apenas corretores ativos usam a Moova.
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Número do CRECI</Label>
                    <Input value={form.creci} onChange={(e) => update("creci", e.target.value)}
                      placeholder="123456" className="border-[#D4C5A0]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Input value={form.creci_state} onChange={(e) => update("creci_state", e.target.value)}
                      placeholder="SP" maxLength={2} className="border-[#D4C5A0] uppercase" />
                  </div>
                </div>
                <div className="text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg p-3">
                  A validação do CRECI é feita em até 24h úteis. Você pode continuar a configuração enquanto aguarda.
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-[#D4C5A0]">Voltar</Button>
                  <Button onClick={handleStep2} disabled={!form.creci}
                    className="flex-1 bg-[#30360E] hover:bg-[#4A5218] text-white">
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 3 — Comprovante de venda */}
            {step === 3 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Comprovante de venda</h2>
                <p className="text-sm text-[#7A7A6A]">
                  Faça o upload de um comprovante de venda concluída (RGI, escritura, ou recibo). Usado apenas para validação do KYC.
                </p>
                <div
                  onClick={() => saleProofRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    saleProofFile
                      ? "border-[#30360E] bg-[#EEF0E8]"
                      : "border-[#D4C5A0] hover:border-[#787F56]"
                  )}
                >
                  {saleProofFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-[#30360E] mx-auto" />
                      <p className="text-sm text-[#30360E] font-medium">{saleProofFile.name}</p>
                      <p className="text-xs text-[#7A7A6A]">{(saleProofFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[#7A7A6A] text-sm">Clique para selecionar o arquivo</p>
                      <p className="text-[#B0A898] text-xs">PDF, JPG ou PNG até 10MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={saleProofRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setSaleProofFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg p-3">
                  Não tem o arquivo em mãos? Você pode pular e enviar depois nas configurações.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-[#D4C5A0]">Voltar</Button>
                  <Button
                    onClick={handleStep3}
                    disabled={uploadingProof}
                    className="flex-1 bg-[#30360E] hover:bg-[#4A5218] text-white"
                  >
                    {uploadingProof ? "Enviando..." : saleProofFile ? "Enviar e continuar" : "Pular por agora"}
                  </Button>
                </div>
              </>
            )}

            {/* Step 4 — LGPD (was step 3) */}
            {step === 4 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Termos e LGPD</h2>
                <div className="text-sm text-[#4A4A3A] space-y-3 max-h-48 overflow-y-auto bg-[#E2D4B9] rounded-lg p-4">
                  <p className="font-medium text-[#30360E]">Termo de Uso e Privacidade — Moova</p>
                  <p>Ao usar a Moova, você autoriza que a Nara atenda seus leads via WhatsApp em seu nome, sempre com disclaimer automático ao lead informando que é uma IA.</p>
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
                    lgpdAccepted ? "bg-[#30360E] border-[#30360E]" : "border-[#D4C5A0]"
                  )}>
                    {lgpdAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-[#4A4A3A]">
                    Li e aceito os Termos de Uso, Política de Privacidade e autorizo o uso de IA no atendimento dos meus leads.
                  </span>
                </button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-[#D4C5A0]">Voltar</Button>
                  <Button onClick={handleStep4} disabled={!lgpdAccepted}
                    className="flex-1 bg-[#30360E] hover:bg-[#4A5218] text-white">
                    Aceitar e continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 6 — Voz */}
            {step === 6 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Personalize a voz da Nara</h2>
                <p className="text-sm text-[#7A7A6A]">
                  Grave as frases abaixo para que a Nara envie áudios com uma voz próxima à sua. Mínimo 2 gravações.
                </p>

                {/* LGPD voz */}
                <div className="bg-[#E2D4B9] rounded-lg p-3 text-xs text-[#4A4A3A] space-y-1">
                  <p className="font-medium text-[#30360E]">Termo de uso de voz (LGPD)</p>
                  <p>Sua voz será processada pelo ElevenLabs exclusivamente para personalizar os áudios da Nara na sua conta. Você pode remover a voz clonada a qualquer momento em Configurações.</p>
                </div>

                <button onClick={() => setVoiceLgpdAccepted(!voiceLgpdAccepted)} className="flex items-start gap-3 w-full text-left">
                  <div className={cn(
                    "w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                    voiceLgpdAccepted ? "bg-[#30360E] border-[#30360E]" : "border-[#D4C5A0]"
                  )}>
                    {voiceLgpdAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-[#4A4A3A]">
                    Autorizo o uso da minha voz para personalizar os áudios da Nara na minha conta Moova.
                  </span>
                </button>

                {voiceLgpdAccepted && !voiceCloned && (
                  <div className="space-y-2">
                    {VOICE_PROMPTS.map((prompt, i) => (
                      <div key={i} className={cn(
                        "border rounded-xl p-3 space-y-2 transition-colors",
                        recordings[i] ? "border-[#30360E] bg-[#EEF0E8]" : "border-[#D4C5A0]"
                      )}>
                        <p className="text-xs text-[#4A4A3A] italic leading-relaxed">&ldquo;{prompt}&rdquo;</p>
                        <div className="flex items-center justify-between gap-2">
                          {recordings[i] ? (
                            <>
                              <span className="text-xs text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Gravado
                              </span>
                              <button onClick={() => setRecordings((p) => { const n = [...p]; n[i] = null; return n })} className="text-xs text-[#7A7A6A] hover:text-red-500">Regravar</button>
                            </>
                          ) : activeRecording === i ? (
                            <>
                              <span className="text-xs text-red-600 flex items-center gap-1 animate-pulse">
                                <MicOff className="w-3 h-3" /> Gravando {recordingTime}s
                              </span>
                              <button onClick={stopVoiceRecording} className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg px-2 py-1">Parar</button>
                            </>
                          ) : (
                            <button
                              onClick={() => startVoiceRecording(i)}
                              disabled={activeRecording !== null}
                              className="text-xs bg-[#E2D4B9] border border-[#D4C5A0] text-[#30360E] rounded-lg px-2 py-1 flex items-center gap-1 disabled:opacity-40"
                            >
                              <Mic className="w-3 h-3" /> Gravar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={handleCloneVoice}
                      disabled={recordings.filter(Boolean).length < 2 || cloningVoice}
                      className="w-full bg-[#787F56] hover:bg-[#9A6128] text-white text-sm gap-2"
                    >
                      {cloningVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                      {cloningVoice ? "Criando voz..." : `Criar voz personalizada (${recordings.filter(Boolean).length}/5)`}
                    </Button>
                  </div>
                )}

                {voiceCloned && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-green-700">Voz personalizada criada!</p>
                    <p className="text-xs text-green-600 mt-0.5">A Nara vai usar sua voz nos áudios.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1 border-[#D4C5A0]">Voltar</Button>
                  <Button onClick={handleFinish} disabled={loading}
                    className="flex-1 bg-[#30360E] hover:bg-[#4A5218] text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : voiceCloned ? "Finalizar →" : "Pular por agora →"}
                  </Button>
                </div>
              </>
            )}

            {/* Step 5 — WhatsApp */}
            {step === 5 && (
              <>
                <h2 className="font-serif text-xl text-[#30360E]">Conectar WhatsApp</h2>
                <p className="text-sm text-[#7A7A6A]">
                  A Nara vai atender seus leads pelo seu número do WhatsApp.
                </p>

                {waConnected ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                    <p className="font-medium text-green-700">WhatsApp conectado!</p>
                    <p className="text-xs text-green-600">A Nara já pode começar a atender.</p>
                  </div>
                ) : qrCode ? (
                  <div className="bg-white border border-[#D4C5A0] rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs text-[#4A4A3A] font-medium">Escaneie com o WhatsApp</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-44 h-44 object-contain mx-auto" />
                    <p className="text-[11px] text-[#7A7A6A]">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectWA}
                    disabled={waConnecting}
                    className="w-full bg-[#30360E] hover:bg-[#4A5218] text-white gap-2"
                  >
                    {waConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {waConnecting ? "Gerando QR Code..." : "Gerar QR Code"}
                  </Button>
                )}

                <div className="text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg p-3">
                  Plano atual: <strong className="text-[#30360E]">Evolution API — R$ 799/mês</strong>.
                  O WhatsApp permanece no seu celular normalmente.
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1 border-[#D4C5A0]">Voltar</Button>
                  <Button onClick={() => setStep(6)} className="flex-1 bg-[#30360E] hover:bg-[#4A5218] text-white">
                    {waConnected ? "Continuar →" : "Conectar depois →"}
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
