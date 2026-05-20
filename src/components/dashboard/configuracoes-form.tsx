"use client"

import { useState, useEffect, useRef } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Wifi, WifiOff, Shield, Loader2, Mic, MicOff, Calendar, CheckCircle2, Clock, Sparkles, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const VOICE_PROMPTS = [
  "Olá! Sou a Nara, assistente do corretor pelo Moova. Como posso ajudar?",
  "Ótimo! Vou verificar as informações desse imóvel para você agora mesmo.",
  "Que excelente escolha! Podemos agendar uma visita amanhã às 10h?",
  "Perfeito. Vou passar todas as informações para o corretor agora.",
  "Qualquer dúvida é só perguntar. Estou aqui para ajudar!",
]

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
  nara_formality: string
  nara_custom_prompt: string | null
  human_approval_active: boolean
  human_approval_categories: HumanApprovalCategories | null
  google_calendar_connected: boolean
  eleven_labs_voice_id: string | null
  nara_work_start: number | null
  nara_work_end: number | null
  portal_slug: string | null
  bio: string | null
  city: string | null
  state_uf: string | null
} | null

type WAAccount = {
  status: string
  phone_number: string | null
  provider: string
  bsp_phone_number_id?: string | null
  bsp_waba_id?: string | null
} | null

type BspPhone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }

export function ConfiguracoesForm({
  profile,
  waAccount,
  calendarConnectedParam,
  calendarErrorParam,
  metaConnectedParam,
  metaErrorParam,
  initialMetaPageName,
  bspConnectedParam,
  bspErrorParam,
  bspPhoneParam,
  bspPickerParam,
  bspPickerPhones,
  bspPickerToken,
  bspManualParam,
}: {
  profile: Profile
  waAccount: WAAccount
  calendarConnectedParam?: boolean
  calendarErrorParam?: boolean
  metaConnectedParam?: boolean
  metaErrorParam?: string | null
  initialMetaPageName?: string | null
  bspConnectedParam?: boolean
  bspErrorParam?: string | null
  bspPhoneParam?: string | null
  bspPickerParam?: boolean
  bspPickerPhones?: BspPhone[]
  bspPickerToken?: string | null
  bspManualParam?: boolean
}) {
  const supabase = createClient()
  const [name, setName] = useState(profile?.name ?? "")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [creci, setCreci] = useState(profile?.creci ?? "")
  const [formality, setFormality] = useState(profile?.nara_formality ?? "informal")
  const [customPrompt, setCustomPrompt] = useState(profile?.nara_custom_prompt ?? "")
  const [humanApproval, setHumanApproval] = useState(profile?.human_approval_active ?? true)
  const [approvalCategories, setApprovalCategories] = useState<HumanApprovalCategories>(
    profile?.human_approval_categories ?? {
      visita: true, valor: true, contraproposta: true, fechamento: true, alto_valor: true,
    }
  )
  const [workStart, setWorkStart] = useState(profile?.nara_work_start ?? 8)
  const [workEnd, setWorkEnd] = useState(profile?.nara_work_end ?? 20)
  const [portalSlug, setPortalSlug] = useState(profile?.portal_slug ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [city, setCity] = useState(profile?.city ?? "")
  const [stateUf, setStateUf] = useState(profile?.state_uf ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analyzingTone, setAnalyzingTone] = useState(false)
  const [connected, setConnected] = useState(waAccount?.status === "connected")

  // QR Code (Evolution API) state
  const [showQrFlow, setShowQrFlow] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // BSP form state
  const [bspPhoneNumberId, setBspPhoneNumberId] = useState(waAccount?.bsp_phone_number_id ?? "")
  const [bspWabaId, setBspWabaId] = useState(waAccount?.bsp_waba_id ?? "")
  const [bspAccessToken, setBspAccessToken] = useState("")
  const [bspConnecting, setBspConnecting] = useState(false)

  // Meta OAuth phone picker state (populated after redirect callback)
  const [embeddedPhones, setEmbeddedPhones] = useState<BspPhone[]>(bspPickerPhones ?? [])
  const [embeddedToken, setEmbeddedToken] = useState(bspPickerToken ?? "")
  const [showPhonePicker, setShowPhonePicker] = useState(bspPickerParam ?? false)
  const [showManualForm, setShowManualForm] = useState(bspManualParam ?? false)

  // Voice cloning state
  const [voiceCloned, setVoiceCloned] = useState(!!profile?.eleven_labs_voice_id)
  const [recordings, setRecordings] = useState<(string | null)[]>([null, null, null, null, null])
  const [activeRecording, setActiveRecording] = useState<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [cloningVoice, setCloningVoice] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Google Calendar state
  const [calendarConnected, setCalendarConnected] = useState(
    (profile?.google_calendar_connected ?? false) || (calendarConnectedParam ?? false)
  )
  const [calendarError] = useState(calendarErrorParam ?? false)

  // Meta / Instagram state
  const [metaConnected, setMetaConnected] = useState(
    !!(profile as { meta_page_name?: string | null } | null)?.meta_page_name || (metaConnectedParam ?? false)
  )
  const [metaPageName, setMetaPageName] = useState<string | null>(
    initialMetaPageName ?? (profile as { meta_page_name?: string | null } | null)?.meta_page_name ?? null
  )
  const [metaError] = useState(metaErrorParam ?? null)


  async function savePhone(phone: { phone_number_id: string; display_phone: string; name: string; waba_id: string }, token: string) {
    const res = await fetch("/api/whatsapp/bsp-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number_id: phone.phone_number_id, waba_id: phone.waba_id, access_token: token, display_phone: phone.display_phone }),
    })
    if (res.ok) {
      setConnected(true)
      setShowPhonePicker(false)
      setBspPhoneNumberId(phone.phone_number_id)
      toast.success(`WhatsApp Business conectado! ${phone.display_phone}`)
    } else {
      const data = await res.json() as { error?: string }
      toast.error(data.error ?? "Erro ao salvar credenciais")
    }
  }

  useEffect(() => {
    if (bspConnectedParam) {
      setConnected(true)
      toast.success(`WhatsApp Business conectado!${bspPhoneParam ? ` Número: ${bspPhoneParam}` : ""}`)
    }
    if (bspErrorParam) toast.error(`Erro BSP: ${bspErrorParam}`)
    if (bspManualParam) {
      toast.info("Token OAuth salvo. Insira seu Phone Number ID para finalizar a conexão.")
    }
    if (bspPickerParam && bspPickerPhones && bspPickerPhones.length > 0) {
      toast.info(`${bspPickerPhones.length} números encontrados. Selecione o número a conectar.`)
    }
  }, [bspConnectedParam, bspErrorParam, bspPhoneParam, bspPickerParam, bspPickerPhones, bspManualParam])

  useEffect(() => {
    if (calendarConnectedParam) toast.success("Google Agenda conectada!")
    if (calendarErrorParam) toast.error("Erro ao conectar Google Agenda. Tente novamente.")
  }, [calendarConnectedParam, calendarErrorParam])

  useEffect(() => {
    if (metaConnectedParam) toast.success(`Instagram/Facebook conectado${metaPageName ? `: ${metaPageName}` : ""}!`)
  }, [metaConnectedParam, metaPageName])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  async function startRecording(index: number) {
    if (activeRecording !== null) stopRecording()
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
          setRecordings((prev) => {
            const next = [...prev]
            next[index] = reader.result as string
            return next
          })
        }
        reader.readAsDataURL(blob)
        setActiveRecording(null)
        setRecordingTime(0)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      }

      setActiveRecording(index)
      recorder.start()

      let secs = 0
      timerRef.current = setInterval(() => {
        secs++
        setRecordingTime(secs)
        if (secs >= 30) stopRecording()
      }, 1000)
    } catch {
      toast.error("Permissão de microfone negada")
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setRecordingTime(0)
  }

  async function handleCloneVoice() {
    const validRecordings = recordings.filter(Boolean) as string[]
    if (validRecordings.length < 2) return
    setCloningVoice(true)
    try {
      const res = await fetch("/api/voice/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audios: validRecordings }),
      })
      if (!res.ok) throw new Error()
      setVoiceCloned(true)
      setRecordings([null, null, null, null, null])
      toast.success("Voz personalizada criada!")
    } catch {
      toast.error("Erro ao clonar voz. Tente novamente.")
    } finally {
      setCloningVoice(false)
    }
  }

  async function handleDeleteVoice() {
    const res = await fetch("/api/voice/clone", { method: "DELETE" })
    if (res.ok) {
      setVoiceCloned(false)
      toast.success("Voz removida com sucesso")
    }
  }

  async function handleDisconnectCalendar() {
    await supabase.from("users").update({
      google_calendar_connected: false,
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_token_expiry: null,
    })
    setCalendarConnected(false)
    toast.success("Google Agenda desconectada")
  }

  async function handleBSPConnect() {
    if (!bspPhoneNumberId.trim()) {
      toast.error("Phone Number ID é obrigatório")
      return
    }
    if (!bspManualParam && !bspAccessToken.trim()) {
      toast.error("Access Token é obrigatório")
      return
    }
    setBspConnecting(true)
    try {
      const body: Record<string, string> = { phone_number_id: bspPhoneNumberId.trim() }
      if (bspWabaId.trim()) body.waba_id = bspWabaId.trim()
      if (bspAccessToken.trim()) body.access_token = bspAccessToken.trim()

      const res = await fetch("/api/whatsapp/bsp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao conectar via BSP")
        return
      }
      setConnected(true)
      setBspAccessToken("")
      toast.success(`WhatsApp Business conectado! ${data.phone ? `Número: ${data.phone}` : ""}`)
    } catch {
      toast.error("Erro ao conectar via BSP. Verifique as credenciais.")
    } finally {
      setBspConnecting(false)
    }
  }

  async function handleBSPDisconnect() {
    await fetch("/api/whatsapp/bsp-connect", { method: "DELETE" })
    setConnected(false)
    toast.success("Credenciais BSP removidas")
  }

  function stopQrPoll() {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null }
  }

  async function startQrFlow() {
    setShowQrFlow(true)
    setQrLoading(true)
    setQrCode(null)
    stopQrPoll()

    const res = await fetch("/api/whatsapp/connect", { method: "POST" })
    const data = await res.json() as { ok?: boolean; qr?: string; error?: string }

    if (!res.ok || data.error) {
      toast.error(data.error ?? "Erro ao iniciar conexão QR")
      setQrLoading(false)
      return
    }

    if (data.qr) {
      setQrCode(data.qr)
      setQrLoading(false)
    } else {
      setQrLoading(false)
    }

    // Poll for QR and connection state every 3s
    qrPollRef.current = setInterval(async () => {
      const r = await fetch("/api/whatsapp/qr")
      const d = await r.json() as { qr?: string | null; connected?: boolean }
      if (d.connected) {
        stopQrPoll()
        setConnected(true)
        setShowQrFlow(false)
        setQrCode(null)
        toast.success("WhatsApp conectado via QR Code!")
        return
      }
      if (d.qr) setQrCode(d.qr)
    }, 3000)
  }

  function cancelQrFlow() {
    stopQrPoll()
    setShowQrFlow(false)
    setQrCode(null)
    setQrLoading(false)
  }

  async function handleAnalyzeTone() {
    setAnalyzingTone(true)
    try {
      const res = await fetch("/api/nara/analyze-tone", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao analisar tom")
        return
      }
      setCustomPrompt(data.customPrompt)
      toast.success("Tom analisado! Revise o texto gerado e salve.")
    } catch {
      toast.error("Erro ao analisar tom")
    } finally {
      setAnalyzingTone(false)
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
          nara_formality: formality,
          nara_custom_prompt: customPrompt || null,
          human_approval_active: humanApproval,
          human_approval_categories: approvalCategories,
          nara_work_start: workStart,
          nara_work_end: workEnd,
          portal_slug: portalSlug || null,
          bio: bio || null,
          city: city || null,
          state_uf: stateUf || null,
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
  const recordingsDone = recordings.filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E]">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="João da Silva" className="border-[#D4C5A0]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>WhatsApp (com DDD)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="11 99999-9999" className="border-[#D4C5A0]" />
            </div>
            <div className="space-y-1.5">
              <Label>CRECI</Label>
              <Input value={creci} onChange={(e) => setCreci(e.target.value)}
                placeholder="123456-SP" className="border-[#D4C5A0]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            {waConnected
              ? <Wifi className="w-4 h-4 text-green-600" />
              : <WifiOff className="w-4 h-4 text-[#7A7A6A]" />
            }
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#2A2A2A]">
                {waConnected ? waAccount?.phone_number ?? "Conectado" : "Não conectado"}
              </p>
              <p className="text-xs text-[#7A7A6A] mt-0.5">
                {waAccount?.provider === "bsp" ? "Meta Cloud API (Oficial)" : waAccount?.provider === "evolution" ? "QR Code (Evolution)" : "WhatsApp"}
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

          {/* NOT CONNECTED */}
          {!waConnected && (
            <div className="space-y-3">
              {showPhonePicker ? (
                /* Phone picker — multiple WABAs found */
                <div className="space-y-2">
                  <p className="text-xs text-[#4A4A3A] font-medium">Selecione o número WhatsApp Business:</p>
                  {embeddedPhones.map((p) => (
                    <button
                      key={p.phone_number_id}
                      onClick={() => savePhone(p, embeddedToken)}
                      className="w-full text-left border border-[#D4C5A0] rounded-lg p-3 bg-white hover:bg-[#EAE2CC] transition-colors"
                    >
                      <p className="text-sm font-medium text-[#30360E]">{p.display_phone}</p>
                      <p className="text-xs text-[#7A7A6A]">{p.name}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowPhonePicker(false); setEmbeddedPhones([]); setEmbeddedToken("") }}
                    className="text-xs text-[#7A7A6A] hover:underline"
                  >
                    ← Voltar
                  </button>
                </div>
              ) : showQrFlow ? (
                /* QR Code flow */
                <div className="rounded-xl border border-[#D4C5A0] p-4 bg-[#F5F0E0] space-y-3 text-center">
                  <p className="text-sm font-medium text-[#30360E]">Escaneie o QR Code com seu WhatsApp</p>
                  {qrLoading ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-[#787F56]" />
                      <p className="text-xs text-[#7A7A6A]">Gerando QR Code...</p>
                    </div>
                  ) : qrCode ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-48 h-48 rounded-lg border border-[#D4C5A0]"
                      />
                      <p className="text-xs text-[#7A7A6A]">Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                      <p className="text-xs text-[#787F56] animate-pulse">Aguardando conexão...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-xs text-[#7A7A6A]">QR Code sendo preparado. Aguarde alguns segundos.</p>
                    </div>
                  )}
                  <button onClick={cancelQrFlow} className="text-xs text-[#7A7A6A] hover:underline">Cancelar</button>
                </div>
              ) : (
                <>
                  {/* OPTION 1 — QR Code (Evolution API) — simpler */}
                  <div className="rounded-xl border-2 border-[#787F56] p-4 bg-[#F5F0E0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📱</span>
                        <p className="text-sm font-medium text-[#30360E]">Conectar via QR Code</p>
                      </div>
                      <span className="text-xs bg-[#787F56] text-white px-2 py-0.5 rounded-full">Mais fácil</span>
                    </div>
                    <p className="text-xs text-[#4A4A3A]">
                      Use qualquer número — pessoal ou comercial. Escaneie o QR Code com o WhatsApp do seu celular e pronto.
                    </p>
                    <Button
                      onClick={startQrFlow}
                      className="w-full bg-[#787F56] hover:bg-[#5A6040] text-white text-sm gap-2"
                    >
                      <Wifi className="w-4 h-4" />
                      Conectar via QR Code
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-[#D4C5A0]" />
                    <span className="text-xs text-[#7A7A6A]">ou use a API oficial</span>
                    <div className="flex-1 h-px bg-[#D4C5A0]" />
                  </div>

                  {/* OPTION 2 — Meta Cloud API (BSP) — official */}
                  <div className="rounded-xl border border-[#D4C5A0] p-4 bg-white space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <p className="text-sm font-medium text-[#30360E]">Meta Cloud API (Oficial)</p>
                      <span className="text-xs text-[#7A7A6A] ml-auto">Plano Premium</span>
                    </div>
                    <p className="text-xs text-[#7A7A6A]">
                      Requer conta Meta Business e número WhatsApp Business registrado.
                    </p>
                    <a
                      href="/api/whatsapp/meta-waba/auth"
                      className="flex items-center justify-center gap-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#1877F2" }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Conectar com Facebook
                    </a>
                    {!showManualForm ? (
                      <button
                        onClick={() => setShowManualForm(true)}
                        className="text-xs text-[#787F56] hover:underline w-full text-center"
                      >
                        Inserir credenciais manualmente →
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-[#D4C5A0]">
                        {bspManualParam && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1.5">
                            <p className="font-semibold">Token salvo. Insira apenas o Phone Number ID:</p>
                            <ol className="list-decimal list-inside space-y-1 text-amber-700">
                              <li>Acesse <strong>business.facebook.com</strong></li>
                              <li>Vá em <strong>WhatsApp Manager → Números de telefone</strong></li>
                              <li>Clique no número → copie o <strong>ID do número de telefone</strong></li>
                              <li>Cole abaixo e clique Conectar</li>
                            </ol>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone Number ID <span className="text-red-500">*</span></Label>
                          <Input value={bspPhoneNumberId} onChange={(e) => setBspPhoneNumberId(e.target.value)} placeholder="ex: 123456789012345" className="border-[#D4C5A0] text-sm h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">WABA ID (opcional)</Label>
                          <Input value={bspWabaId} onChange={(e) => setBspWabaId(e.target.value)} placeholder="ex: 987654321098765" className="border-[#D4C5A0] text-sm h-8" />
                        </div>
                        {!bspManualParam && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Access Token <span className="text-red-500">*</span></Label>
                            <Input value={bspAccessToken} onChange={(e) => setBspAccessToken(e.target.value)} type="password" placeholder="EAAxxxxxxxx..." className="border-[#D4C5A0] text-sm h-8" />
                          </div>
                        )}
                        <Button
                          onClick={handleBSPConnect}
                          disabled={bspConnecting || !bspPhoneNumberId.trim() || (!bspManualParam && !bspAccessToken.trim())}
                          className="w-full bg-[#30360E] hover:bg-[#20240A] text-white text-sm gap-2"
                        >
                          {bspConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                          {bspConnecting ? "Salvando..." : "Conectar via Meta Cloud API"}
                        </Button>
                        {!bspManualParam && (
                          <button onClick={() => setShowManualForm(false)} className="text-xs text-[#7A7A6A] hover:underline w-full text-center">Cancelar</button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* CONNECTED */}
          {waConnected && (
            <div className="space-y-2">
              {waAccount?.provider === "bsp" && (
                <>
                  <p className="text-xs text-[#4A4A3A]">
                    <strong>Phone Number ID:</strong> {waAccount?.bsp_phone_number_id ?? bspPhoneNumberId}
                  </p>
                  {waAccount?.bsp_waba_id && (
                    <p className="text-xs text-[#4A4A3A]">
                      <strong>WABA ID:</strong> {waAccount.bsp_waba_id}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBSPDisconnect}
                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs w-full mt-1"
                  >
                    Remover credenciais BSP
                  </Button>
                </>
              )}
              {waAccount?.provider === "evolution" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await fetch("/api/whatsapp/connect", { method: "DELETE" }).catch(() => {})
                    setConnected(false)
                    toast.success("WhatsApp desconectado")
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs w-full mt-1"
                >
                  Desconectar WhatsApp
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Agenda */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Google Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendarConnected ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Google Agenda conectada
                </p>
                <p className="text-xs text-green-600 mt-0.5">A Nara verifica sua disponibilidade ao agendar visitas</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectCalendar}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs shrink-0 ml-2"
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#4A4A3A]">
                Conecte sua agenda para que a Nara sugira visitas apenas em horários livres.
              </p>
              <a
                href="/api/calendar/auth"
                className="flex items-center justify-center gap-2 w-full bg-[#30360E] hover:bg-[#4A5218] text-white text-sm py-2.5 px-4 rounded-md transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Conectar Google Agenda
              </a>
              {calendarError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 text-center">
                  Erro ao conectar. Verifique as credenciais e tente novamente.
                </p>
              )}
              <p className="text-xs text-[#7A7A6A]">
                Acesso somente leitura. A Nara não cria nem modifica eventos.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Voz da Nara */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voz da Nara
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceCloned ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Voz personalizada ativa
                </p>
                <p className="text-xs text-green-600 mt-0.5">A Nara usa sua voz clonada nos áudios</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteVoice}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs shrink-0 ml-2"
              >
                Remover voz
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#4A4A3A]">
                Grave as frases abaixo para que a Nara envie áudios com uma voz próxima à sua.
              </p>
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
                          <button
                            onClick={() => startRecording(i)}
                            disabled={activeRecording !== null}
                            className="text-xs text-[#7A7A6A] hover:text-[#30360E] transition-colors"
                          >
                            Re-gravar
                          </button>
                        </>
                      ) : activeRecording === i ? (
                        <>
                          <span className="text-xs text-red-600 flex items-center gap-1 animate-pulse">
                            <MicOff className="w-3 h-3" /> Gravando {recordingTime}s
                          </span>
                          <button
                            onClick={stopRecording}
                            className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
                          >
                            Parar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startRecording(i)}
                          disabled={activeRecording !== null && activeRecording !== i}
                          className="text-xs bg-[#E2D4B9] text-[#4A4A3A] px-3 py-1 rounded-lg hover:bg-[#D4C5A0] transition-colors disabled:opacity-40 flex items-center gap-1"
                        >
                          <Mic className="w-3 h-3" /> Gravar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCloneVoice}
                disabled={recordingsDone < 2 || cloningVoice}
                className="w-full bg-[#30360E] hover:bg-[#4A5218] text-white text-sm gap-2"
              >
                {cloningVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {cloningVoice
                  ? "Criando voz..."
                  : recordingsDone > 0
                  ? `Criar voz personalizada (${recordingsDone}/5 gravações)`
                  : "Criar voz personalizada"
                }
              </Button>
              <p className="text-xs text-[#7A7A6A] text-center">
                Mínimo 2 gravações. Mais gravações = melhor qualidade.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tom da Nara */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E]">Tom da Nara</CardTitle>
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
                      ? "border-[#30360E] bg-[#30360E]/5"
                      : "border-[#D4C5A0] hover:border-[#30360E]/40"
                  )}
                >
                  <p className="text-sm font-medium text-[#2A2A2A]">{label}</p>
                  <p className="text-xs text-[#7A7A6A] mt-1 italic">{ex}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-[#2A2A2A]">Instruções extras para a Nara (opcional)</Label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Sempre mencione que trabalhamos com financiamento Caixa. Foque em imóveis de alto padrão."
              rows={3}
              className="w-full text-sm border border-[#D4C5A0] rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:border-[#30360E] text-[#2A2A2A] placeholder:text-[#7A7A6A]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyzeTone}
              disabled={analyzingTone}
              className="w-full border-[#D4C5A0] text-[#4A4A3A] text-xs gap-1.5 hover:border-[#30360E] hover:text-[#30360E]"
            >
              {analyzingTone
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              {analyzingTone ? "Analisando suas mensagens..." : "Analisar meu estilo de comunicação (IA)"}
            </Button>
            <p className="text-xs text-[#7A7A6A]">O piso de identidade da Nara Constitution nunca é alterado.</p>
          </div>
        </CardContent>
      </Card>

      {/* Horário de operação */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horário de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#4A4A3A]">
            Fora desse horário, a Nara envia uma mensagem automática informando o horário de retorno.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Início do atendimento</Label>
              <select
                value={workStart}
                onChange={(e) => setWorkStart(Number(e.target.value))}
                className="w-full border border-[#D4C5A0] rounded-lg px-3 py-2 text-sm bg-white text-[#2A2A2A] focus:outline-none focus:border-[#30360E]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}h00</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fim do atendimento</Label>
              <select
                value={workEnd}
                onChange={(e) => setWorkEnd(Number(e.target.value))}
                className="w-full border border-[#D4C5A0] rounded-lg px-3 py-2 text-sm bg-white text-[#2A2A2A] focus:outline-none focus:border-[#30360E]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}h00</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-[#7A7A6A]">
            Horário atual configurado: {String(workStart).padStart(2, "0")}h às {String(workEnd).padStart(2, "0")}h (Brasília)
          </p>
        </CardContent>
      </Card>

      {/* Aprovação humana */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Aprovação Humana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#2A2A2A]">Aprovar mensagens críticas manualmente</p>
              <p className="text-xs text-[#7A7A6A] mt-0.5">
                Proposta de visita, valores, contrapropostas, fechamentos
              </p>
            </div>
            <button
              onClick={() => setHumanApproval(!humanApproval)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                humanApproval ? "bg-[#30360E]" : "bg-[#D4C5A0]"
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
              <p className="text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg p-3">
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
                      <span className="text-xs text-[#4A4A3A]">{labels[cat]}</span>
                      <button
                        onClick={() => setApprovalCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative shrink-0",
                          active ? "bg-[#30360E]" : "bg-[#D4C5A0]"
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

      {/* Moova Portal */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E]">Moova Portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#4A4A3A]">
            Seu site profissional gerado automaticamente com portfólio de imóveis.
          </p>
          <div className="space-y-1.5">
            <Label>URL do seu portal</Label>
            <div className="flex items-center gap-0">
              <span className="bg-[#E2D4B9] border border-r-0 border-[#D4C5A0] rounded-l-lg px-3 py-2 text-sm text-[#7A7A6A] whitespace-nowrap">
                moovaimob.com/p/
              </span>
              <Input
                value={portalSlug}
                onChange={(e) => setPortalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="seu-nome"
                className="border-[#D4C5A0] rounded-l-none"
              />
            </div>
            {portalSlug && (
              <a
                href={`/p/${portalSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#787F56] hover:underline"
              >
                Ver portal → moovaimob.com/p/{portalSlug}
              </a>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Bio (apresentação pública)</Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ex: Corretor especialista em alto padrão em São Paulo há 10 anos. CRECI-SP ativo."
              rows={3}
              className="w-full text-sm border border-[#D4C5A0] rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:border-[#30360E] text-[#2A2A2A] placeholder:text-[#7A7A6A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
                className="border-[#D4C5A0]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <Input
                value={stateUf}
                onChange={(e) => setStateUf(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="border-[#D4C5A0]"
              />
            </div>
          </div>
          <div className="bg-[#E2D4B9] rounded-lg p-3 text-xs text-[#4A4A3A]">
            Feed XML para portais (ZAP, VivaReal, Imovelweb) disponível em{" "}
            <code className="font-mono text-[#30360E]">/api/portal/xml</code>
          </div>
        </CardContent>
      </Card>

      {/* Instagram / Facebook */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Instagram &amp; Facebook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metaConnected ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Conta conectada{metaPageName ? `: ${metaPageName}` : ""}
                </p>
                <p className="text-xs text-green-600 mt-0.5">Publique posts aprovados diretamente do Moova</p>
              </div>
              <button
                onClick={async () => {
                  await fetch("/api/social/meta/disconnect", { method: "POST" })
                  setMetaConnected(false)
                  setMetaPageName(null)
                  toast.success("Conta Meta desconectada.")
                }}
                className="text-xs text-red-500 hover:underline shrink-0 ml-4"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#4A4A3A]">
                Conecte sua Página do Facebook (e Instagram Business vinculado) para publicar posts aprovados diretamente do Moova.
              </p>
              <a
                href="/api/social/meta/auth"
                className="flex items-center justify-center gap-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm py-2.5 px-4 rounded-md transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Conectar Instagram / Facebook
              </a>
              {metaError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 text-center">
                  {metaError === "denied"
                    ? "Autorização negada. Aceite as permissões para continuar."
                    : metaError === "config"
                    ? "META_APP_ID/META_APP_SECRET não configurados. Adicione no Vercel."
                    : "Erro ao conectar. Tente novamente."}
                </p>
              )}
              <div className="bg-[#E2D4B9] rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-[#30360E]">Pré-requisitos:</p>
                <ul className="text-xs text-[#4A4A3A] space-y-1 list-disc list-inside">
                  <li>Página do Facebook ativa</li>
                  <li>Conta Instagram Business conectada à página</li>
                  <li>App Meta aprovado com permissões <code className="font-mono">pages_manage_posts</code> + <code className="font-mono">instagram_content_publish</code></li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-[#D4C5A0]" />

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#30360E] hover:bg-[#4A5218] text-white text-sm min-w-[140px]"
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  )
}
