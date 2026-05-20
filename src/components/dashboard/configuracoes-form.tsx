"use client"

import { useState, useEffect, useRef } from "react"

declare global {
  interface Window {
    FB: {
      init: (opts: object) => void
      login: (cb: (r: { authResponse?: { accessToken: string } }) => void, opts?: object) => void
    }
    fbAsyncInit: () => void
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Wifi, WifiOff, RefreshCw, Shield, Loader2, Mic, MicOff, Calendar, CheckCircle2, Clock, Sparkles, Share2 } from "lucide-react"
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
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(waAccount?.status === "connected")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [currentProvider, setCurrentProvider] = useState<string>(waAccount?.provider ?? "evolution")

  // BSP form state
  const [bspPhoneNumberId, setBspPhoneNumberId] = useState(waAccount?.bsp_phone_number_id ?? "")
  const [bspWabaId, setBspWabaId] = useState(waAccount?.bsp_waba_id ?? "")
  const [bspAccessToken, setBspAccessToken] = useState("")
  const [bspConnecting, setBspConnecting] = useState(false)
  const [showBspForm, setShowBspForm] = useState(false)

  // Meta Embedded Signup state
  const [fbConnecting, setFbConnecting] = useState(false)
  const [embeddedPhones, setEmbeddedPhones] = useState<Array<{ phone_number_id: string; display_phone: string; name: string; waba_id: string }>>([])
  const [embeddedToken, setEmbeddedToken] = useState("")
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)

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

  // Load Facebook JS SDK
  useEffect(() => {
    if (typeof window === "undefined" || document.getElementById("fb-sdk")) return
    window.fbAsyncInit = function () {
      window.FB.init({ appId: "946137871507469", cookie: true, xfbml: true, version: "v19.0" })
    }
    const script = document.createElement("script")
    script.id = "fb-sdk"
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  async function saveEmbeddedPhone(phone: { phone_number_id: string; display_phone: string; name: string; waba_id: string }, token: string) {
    const res = await fetch("/api/whatsapp/bsp-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number_id: phone.phone_number_id, waba_id: phone.waba_id, access_token: token, display_phone: phone.display_phone }),
    })
    if (res.ok) {
      setConnected(true)
      setCurrentProvider("bsp")
      setShowPhonePicker(false)
      setShowBspForm(false)
      setBspPhoneNumberId(phone.phone_number_id)
      toast.success(`WhatsApp Business conectado! ${phone.display_phone}`)
    } else {
      const data = await res.json() as { error?: string }
      toast.error(data.error ?? "Erro ao salvar credenciais")
    }
  }

  async function handleFacebookLogin() {
    if (typeof window === "undefined" || !window.FB) {
      toast.error("SDK do Facebook não carregou. Recarregue a página.")
      return
    }
    setFbConnecting(true)
    window.FB.login(async (response) => {
      if (!response.authResponse) { setFbConnecting(false); return }
      try {
        const res = await fetch("/api/whatsapp/meta-embedded", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: response.authResponse.accessToken }),
        })
        const data = await res.json() as { token?: string; phones?: typeof embeddedPhones; error?: string }
        if (!res.ok) { toast.error(data.error ?? "Erro ao buscar contas WhatsApp"); return }
        setEmbeddedToken(data.token ?? "")
        const phones = data.phones ?? []
        if (phones.length === 0) {
          toast.error("Nenhum número WhatsApp Business encontrado nessa conta Facebook.")
        } else if (phones.length === 1) {
          await saveEmbeddedPhone(phones[0], data.token ?? "")
        } else {
          setEmbeddedPhones(phones)
          setShowPhonePicker(true)
        }
      } catch {
        toast.error("Erro ao conectar com Facebook")
      } finally {
        setFbConnecting(false)
      }
    }, { scope: "whatsapp_business_management,whatsapp_business_messaging", return_scopes: true })
  }

  useEffect(() => {
    if (bspConnectedParam) {
      setConnected(true)
      setCurrentProvider("bsp")
      toast.success(`WhatsApp Business conectado!${bspPhoneParam ? ` Número: ${bspPhoneParam}` : ""}`)
    }
    if (bspErrorParam) toast.error(`Erro BSP: ${bspErrorParam}`)
  }, [bspConnectedParam, bspErrorParam, bspPhoneParam])

  useEffect(() => {
    if (calendarConnectedParam) toast.success("Google Agenda conectada!")
    if (calendarErrorParam) toast.error("Erro ao conectar Google Agenda. Tente novamente.")
  }, [calendarConnectedParam, calendarErrorParam])

  useEffect(() => {
    if (metaConnectedParam) toast.success(`Instagram/Facebook conectado${metaPageName ? `: ${metaPageName}` : ""}!`)
  }, [metaConnectedParam, metaPageName])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
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

  async function handleConnect() {
    setConnecting(true)
    setQrCode(null)
    if (pollRef.current) clearInterval(pollRef.current)

    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao conectar WhatsApp")
        return
      }
    } catch {
      toast.error("Erro ao iniciar conexão WhatsApp")
      return
    } finally {
      setConnecting(false)
    }

    // Poll client-side for QR and connection state
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      if (attempts > 30) {
        clearInterval(pollRef.current!)
        toast.error("QR Code não disponível. Verifique a Evolution API e tente novamente.")
        return
      }
      try {
        const res = await fetch("/api/whatsapp/qr")
        if (!res.ok) return
        const data = await res.json() as { qr?: string | null; connected?: boolean }
        if (data.connected) {
          setConnected(true)
          setQrCode(null)
          clearInterval(pollRef.current!)
          toast.success("WhatsApp conectado!")
        } else if (data.qr) {
          const src = data.qr.startsWith("data:") ? data.qr : `data:image/png;base64,${data.qr}`
          setQrCode(src)
        }
      } catch {}
    }, 2000)
  }

  async function handleBSPConnect() {
    if (!bspPhoneNumberId.trim() || !bspAccessToken.trim()) {
      toast.error("Phone Number ID e Access Token são obrigatórios")
      return
    }
    setBspConnecting(true)
    try {
      const res = await fetch("/api/whatsapp/bsp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: bspPhoneNumberId.trim(),
          waba_id: bspWabaId.trim() || undefined,
          access_token: bspAccessToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao conectar via BSP")
        return
      }
      setConnected(true)
      setCurrentProvider("bsp")
      setShowBspForm(false)
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
    setCurrentProvider("evolution")
    toast.success("Credenciais BSP removidas")
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
                {currentProvider === "bsp" ? "Meta Cloud API (BSP Oficial)" : "Evolution API"}
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

          {/* Evolution: QR Code flow */}
          {currentProvider !== "bsp" && (
            <div className="space-y-3">
              {!waConnected && (
                <>
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
                </>
              )}
              <button
                onClick={() => setShowBspForm(true)}
                className="text-xs text-[#B87333] hover:underline"
              >
                Tem plano BSP? Conectar via Meta Cloud API →
              </button>
            </div>
          )}

          {/* BSP: Meta Cloud API */}
          {(currentProvider === "bsp" || showBspForm) && (
            <div className="space-y-3 border border-[#E0D8CE] rounded-xl p-4 bg-[#FAF7F2]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#2D4A3E]">Meta Cloud API (BSP)</p>
                {showBspForm && currentProvider !== "bsp" && (
                  <button onClick={() => { setShowBspForm(false); setShowPhonePicker(false); setShowManualForm(false) }} className="text-xs text-[#8A8A8A] hover:text-[#5A5A5A]">
                    Cancelar
                  </button>
                )}
              </div>

              {currentProvider === "bsp" && waConnected ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#5A5A5A]">
                    <strong>Phone Number ID:</strong> {waAccount?.bsp_phone_number_id ?? bspPhoneNumberId}
                  </p>
                  {waAccount?.bsp_waba_id && (
                    <p className="text-xs text-[#5A5A5A]">
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
                </div>
              ) : showPhonePicker ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#5A5A5A] font-medium">Selecione o número WhatsApp Business:</p>
                  {embeddedPhones.map((phone) => (
                    <button
                      key={phone.phone_number_id}
                      onClick={() => saveEmbeddedPhone(phone, embeddedToken)}
                      className="w-full text-left border border-[#E0D8CE] rounded-lg p-3 bg-white hover:bg-[#F0EBE3] transition-colors"
                    >
                      <p className="text-sm font-medium text-[#2D4A3E]">{phone.display_phone}</p>
                      <p className="text-xs text-[#8A8A8A]">{phone.name}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Primary: Facebook OAuth redirect */}
                  <a
                    href="/api/whatsapp/meta-waba/auth"
                    className="flex items-center justify-center gap-2 w-full rounded-md px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: "#1877F2" }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Conectar com Facebook
                  </a>
                  <p className="text-[11px] text-[#8A8A8A] text-center">
                    Redireciona para o login do Facebook e importa seu WhatsApp Business automaticamente
                  </p>

                  {/* Manual fallback */}
                  {!showManualForm ? (
                    <button
                      onClick={() => setShowManualForm(true)}
                      className="text-xs text-[#B87333] hover:underline w-full text-center"
                    >
                      Preferir inserir credenciais manualmente →
                    </button>
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-[#E0D8CE]">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone Number ID <span className="text-red-500">*</span></Label>
                        <Input value={bspPhoneNumberId} onChange={(e) => setBspPhoneNumberId(e.target.value)} placeholder="ex: 123456789012345" className="border-[#E0D8CE] text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">WABA ID (opcional)</Label>
                        <Input value={bspWabaId} onChange={(e) => setBspWabaId(e.target.value)} placeholder="ex: 987654321098765" className="border-[#E0D8CE] text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Access Token <span className="text-red-500">*</span></Label>
                        <Input value={bspAccessToken} onChange={(e) => setBspAccessToken(e.target.value)} type="password" placeholder="EAAxxxxxxxx..." className="border-[#E0D8CE] text-sm h-8" />
                      </div>
                      <Button
                        onClick={handleBSPConnect}
                        disabled={bspConnecting || !bspPhoneNumberId.trim() || !bspAccessToken.trim()}
                        className="w-full bg-[#2D4A3E] hover:bg-[#1e3329] text-white text-sm gap-2"
                      >
                        {bspConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        {bspConnecting ? "Salvando..." : "Conectar via Meta Cloud API"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentProvider !== "bsp" && !showBspForm && (
            <div className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-3 space-y-1">
              <p className="font-medium text-[#5A5A5A]">Plano Evolution API — R$ 799/mês</p>
              <p>Migração para BSP oficial (selo verde Meta) disponível no plano R$ 1.199/mês.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Agenda */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
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
              <p className="text-sm text-[#5A5A5A]">
                Conecte sua agenda para que a Nara sugira visitas apenas em horários livres.
              </p>
              <a
                href="/api/calendar/auth"
                className="flex items-center justify-center gap-2 w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm py-2.5 px-4 rounded-md transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Conectar Google Agenda
              </a>
              {calendarError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 text-center">
                  Erro ao conectar. Verifique as credenciais e tente novamente.
                </p>
              )}
              <p className="text-xs text-[#8A8A8A]">
                Acesso somente leitura. A Nara não cria nem modifica eventos.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Voz da Nara */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
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
              <p className="text-sm text-[#5A5A5A]">
                Grave as frases abaixo para que a Nara envie áudios com uma voz próxima à sua.
              </p>
              <div className="space-y-2">
                {VOICE_PROMPTS.map((prompt, i) => (
                  <div key={i} className={cn(
                    "border rounded-xl p-3 space-y-2 transition-colors",
                    recordings[i] ? "border-[#2D4A3E] bg-[#F0F5F2]" : "border-[#E0D8CE]"
                  )}>
                    <p className="text-xs text-[#5A5A5A] italic leading-relaxed">&ldquo;{prompt}&rdquo;</p>
                    <div className="flex items-center justify-between gap-2">
                      {recordings[i] ? (
                        <>
                          <span className="text-xs text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Gravado
                          </span>
                          <button
                            onClick={() => startRecording(i)}
                            disabled={activeRecording !== null}
                            className="text-xs text-[#8A8A8A] hover:text-[#2D4A3E] transition-colors"
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
                          className="text-xs bg-[#EAE3D9] text-[#5A5A5A] px-3 py-1 rounded-lg hover:bg-[#E0D8CE] transition-colors disabled:opacity-40 flex items-center gap-1"
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
                className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2"
              >
                {cloningVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {cloningVoice
                  ? "Criando voz..."
                  : recordingsDone > 0
                  ? `Criar voz personalizada (${recordingsDone}/5 gravações)`
                  : "Criar voz personalizada"
                }
              </Button>
              <p className="text-xs text-[#8A8A8A] text-center">
                Mínimo 2 gravações. Mais gravações = melhor qualidade.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tom da Nara */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E]">Tom da Nara</CardTitle>
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
            <Label className="text-sm text-[#2A2A2A]">Instruções extras para a Nara (opcional)</Label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Sempre mencione que trabalhamos com financiamento Caixa. Foque em imóveis de alto padrão."
              rows={3}
              className="w-full text-sm border border-[#E0D8CE] rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:border-[#2D4A3E] text-[#2A2A2A] placeholder:text-[#8A8A8A]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyzeTone}
              disabled={analyzingTone}
              className="w-full border-[#E0D8CE] text-[#5A5A5A] text-xs gap-1.5 hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
            >
              {analyzingTone
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              {analyzingTone ? "Analisando suas mensagens..." : "Analisar meu estilo de comunicação (IA)"}
            </Button>
            <p className="text-xs text-[#8A8A8A]">O piso de identidade da Nara Constitution nunca é alterado.</p>
          </div>
        </CardContent>
      </Card>

      {/* Horário de operação */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horário de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#5A5A5A]">
            Fora desse horário, a Nara envia uma mensagem automática informando o horário de retorno.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Início do atendimento</Label>
              <select
                value={workStart}
                onChange={(e) => setWorkStart(Number(e.target.value))}
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white text-[#2A2A2A] focus:outline-none focus:border-[#2D4A3E]"
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
                className="w-full border border-[#E0D8CE] rounded-lg px-3 py-2 text-sm bg-white text-[#2A2A2A] focus:outline-none focus:border-[#2D4A3E]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}h00</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-[#8A8A8A]">
            Horário atual configurado: {String(workStart).padStart(2, "0")}h às {String(workEnd).padStart(2, "0")}h (Brasília)
          </p>
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

      {/* Moova Portal */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E]">Moova Portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#5A5A5A]">
            Seu site profissional gerado automaticamente com portfólio de imóveis.
          </p>
          <div className="space-y-1.5">
            <Label>URL do seu portal</Label>
            <div className="flex items-center gap-0">
              <span className="bg-[#EAE3D9] border border-r-0 border-[#E0D8CE] rounded-l-lg px-3 py-2 text-sm text-[#8A8A8A] whitespace-nowrap">
                moovaimob.com/p/
              </span>
              <Input
                value={portalSlug}
                onChange={(e) => setPortalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="seu-nome"
                className="border-[#E0D8CE] rounded-l-none"
              />
            </div>
            {portalSlug && (
              <a
                href={`/p/${portalSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#B87333] hover:underline"
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
              className="w-full text-sm border border-[#E0D8CE] rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:border-[#2D4A3E] text-[#2A2A2A] placeholder:text-[#8A8A8A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
                className="border-[#E0D8CE]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <Input
                value={stateUf}
                onChange={(e) => setStateUf(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="border-[#E0D8CE]"
              />
            </div>
          </div>
          <div className="bg-[#EAE3D9] rounded-lg p-3 text-xs text-[#5A5A5A]">
            Feed XML para portais (ZAP, VivaReal, Imovelweb) disponível em{" "}
            <code className="font-mono text-[#2D4A3E]">/api/portal/xml</code>
          </div>
        </CardContent>
      </Card>

      {/* Instagram / Facebook */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
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
              <p className="text-sm text-[#5A5A5A]">
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
              <div className="bg-[#EAE3D9] rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-[#2D4A3E]">Pré-requisitos:</p>
                <ul className="text-xs text-[#5A5A5A] space-y-1 list-disc list-inside">
                  <li>Página do Facebook ativa</li>
                  <li>Conta Instagram Business conectada à página</li>
                  <li>App Meta aprovado com permissões <code className="font-mono">pages_manage_posts</code> + <code className="font-mono">instagram_content_publish</code></li>
                </ul>
              </div>
            </>
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
