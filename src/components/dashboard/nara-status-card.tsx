"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

type ServiceStatus = "ok" | "degraded" | "unknown"

type HealthData = {
  ok: boolean
  services: {
    openai: ServiceStatus
    anthropic: ServiceStatus
    evolution: ServiceStatus
  }
}

const SERVICE_LABELS = {
  openai: "OpenAI GPT-4o",
  anthropic: "Anthropic Claude (fallback)",
  evolution: "WhatsApp (Evolution API)",
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === "ok") return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Operando</Badge>
  if (status === "degraded") return <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Degradado</Badge>
  return <Badge className="bg-[#E2D4B9] text-[#7A7A6A] text-xs">Verificando...</Badge>
}

export function NaraStatusCard() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError(true))
  }, [])

  const allOk = health?.ok ?? null

  return (
    <Card className="border-[#D4C5A0]">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${
            allOk === null ? "bg-[#D4C5A0] animate-pulse" :
            allOk ? "bg-green-500" : "bg-red-500"
          }`} />
          Nara — Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(["openai", "anthropic", "evolution"] as const).map((key) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-[#4A4A3A]">{SERVICE_LABELS[key]}</span>
            <StatusBadge status={health?.services[key] ?? "unknown"} />
          </div>
        ))}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Não foi possível verificar o status. Verifique as chaves de API.
          </div>
        )}
        {!error && !health?.services.evolution && health && (
          <div className="flex items-center gap-2 mt-4 text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Configure o WhatsApp em Configurações para a Nara começar a atender.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
