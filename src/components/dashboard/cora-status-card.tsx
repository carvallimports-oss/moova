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
  return <Badge className="bg-[#EAE3D9] text-[#8A8A8A] text-xs">Verificando...</Badge>
}

export function CoraStatusCard() {
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
    <Card className="border-[#E0D8CE]">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${
            allOk === null ? "bg-[#E0D8CE] animate-pulse" :
            allOk ? "bg-green-500" : "bg-red-500"
          }`} />
          Cora — Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(["openai", "anthropic", "evolution"] as const).map((key) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-[#5A5A5A]">{SERVICE_LABELS[key]}</span>
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
          <div className="flex items-center gap-2 mt-4 text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Configure o WhatsApp em Configurações para a Cora começar a atender.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
