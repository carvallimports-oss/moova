import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { NaraStatusCard } from "@/components/dashboard/nara-status-card"
import {
  MessageSquare,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  MapPin,
  Clock,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <Card className="border-[#D4C5A0]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#7A7A6A] uppercase tracking-wide font-mono">{title}</p>
            <p className={`text-3xl font-serif mt-1 ${accent ? "text-[#787F56]" : "text-[#30360E]"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-[#7A7A6A] mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accent ? "bg-[#787F56]/10" : "bg-[#30360E]/10"}`}>
            <Icon className={`w-5 h-5 ${accent ? "text-[#787F56]" : "text-[#30360E]"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function statusColor(status: string) {
  if (status === "confirmada") return "bg-green-50 text-green-700 border-green-200"
  if (status === "cancelada") return "bg-red-50 text-red-700 border-red-200"
  return "bg-orange-50 text-orange-700 border-orange-200"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const in7days = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

  const [
    { count: leadsTotal },
    { count: visitasAgendadas },
    { data: diagnostico },
    { data: proximasVisitas },
    { data: incidents },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("visits").select("*", { count: "exact", head: true })
      .eq("user_id", user!.id).in("status", ["pendente", "confirmada"])
      .gte("scheduled_at", new Date().toISOString()),
    supabase.from("diagnostico_nara_14d").select("*")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("visits")
      .select(`id, scheduled_at, status, address, leads(name)`)
      .eq("user_id", user!.id)
      .in("status", ["pendente", "confirmada"])
      .gte("scheduled_at", new Date().toISOString())
      .lte("scheduled_at", in7days)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase.from("fallback_incidents")
      .select("id, started_at, resolved_at, openai_status, anthropic_status")
      .order("started_at", { ascending: false })
      .limit(3),
  ])

  const diagnosticoAtivo = diagnostico as {
    id: string
    started_at: string
    ends_at: string
    leads_attended: number
    cold_leads_reactivated: number
    visits_scheduled: number
    estimated_commission: number
  } | null

  const diasRestantes = diagnosticoAtivo
    ? Math.max(0, Math.ceil((new Date(diagnosticoAtivo.ends_at).getTime() - Date.now()) / 86400000))
    : null

  const progressoPct = diagnosticoAtivo
    ? Math.round(((14 - (diasRestantes ?? 0)) / 14) * 100)
    : 0

  type Visit = { id: string; scheduled_at: string; status: string | null; address: string | null; leads: { name: string }[] | null }
  type Incident = { id: string; started_at: string; resolved_at: string | null; openai_status: string; anthropic_status: string }

  const visitas = (proximasVisitas ?? []) as unknown as Visit[]
  const incidentes = (incidents ?? []) as Incident[]

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Início</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Diagnóstico banner */}
      {diagnosticoAtivo && (
        <Card className="border-[#787F56]/30 bg-gradient-to-r from-[#787F56]/5 to-[#30360E]/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#787F56]" />
                  <span className="text-sm font-medium text-[#30360E]">Diagnóstico Nara 14 Dias</span>
                  <Badge className="bg-[#787F56]/10 text-[#787F56] text-[10px] border-0">
                    {diasRestantes} dias restantes
                  </Badge>
                </div>
                <Progress value={progressoPct} className="h-1.5 bg-[#D4C5A0]" />
                <div className="flex gap-6 mt-3 text-sm">
                  <span className="text-[#4A4A3A]">
                    <strong className="text-[#30360E]">{diagnosticoAtivo.leads_attended}</strong> leads atendidos
                  </span>
                  <span className="text-[#4A4A3A]">
                    <strong className="text-[#30360E]">{diagnosticoAtivo.visits_scheduled}</strong> visitas agendadas
                  </span>
                  <span className="text-[#4A4A3A]">
                    <strong className="text-[#787F56]">
                      R$ {diagnosticoAtivo.estimated_commission.toLocaleString("pt-BR")}
                    </strong>{" "}
                    em potencial
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de leads" value={leadsTotal ?? 0} icon={Users} />
        <StatCard title="Visitas pendentes" value={visitasAgendadas ?? 0} icon={Calendar} />
        <StatCard
          title="Comissão potencial"
          value={`R$ ${(diagnosticoAtivo?.estimated_commission ?? 0).toLocaleString("pt-BR")}`}
          icon={TrendingUp}
          accent
        />
        <StatCard
          title="Leads reativados"
          value={diagnosticoAtivo?.cold_leads_reactivated ?? 0}
          sub="frios que voltaram"
          icon={MessageSquare}
        />
      </div>

      {/* Próximos compromissos + Status Nara */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas visitas */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-[#30360E] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Próximas visitas
              </span>
              <Link
                href="/dashboard/visitas"
                className="text-xs text-[#787F56] font-sans font-normal hover:underline"
              >
                Ver todas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visitas.length === 0 ? (
              <p className="text-sm text-[#7A7A6A] text-center py-6">
                Nenhuma visita nos próximos 7 dias.
              </p>
            ) : (
              visitas.map((v) => {
                const dt = new Date(v.scheduled_at)
                return (
                  <div key={v.id} className="flex items-start justify-between gap-2 py-2 border-b border-[#F5F0EB] last:border-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#2A2A2A]">{Array.isArray(v.leads) ? v.leads[0]?.name : (v.leads as { name: string } | null)?.name ?? "Lead"}</p>
                      <div className="flex items-center gap-3 text-xs text-[#7A7A6A]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}{" "}
                          {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {v.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {v.address.length > 30 ? v.address.slice(0, 30) + "…" : v.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={`text-[10px] border shrink-0 ${statusColor(v.status ?? "pendente")}`}>
                      {v.status ?? "pendente"}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Status Nara */}
        <NaraStatusCard />
      </div>

      {/* Timeline de incidentes */}
      {incidentes.length > 0 && (
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E67E22]" />
              Incidentes recentes — Modo degradado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentes.map((inc) => {
              const started = new Date(inc.started_at)
              const resolved = inc.resolved_at ? new Date(inc.resolved_at) : null
              const durationMs = resolved ? resolved.getTime() - started.getTime() : null
              const durationMin = durationMs ? Math.round(durationMs / 60000) : null

              return (
                <div key={inc.id} className="flex items-start justify-between gap-4 py-2 border-b border-[#F5F0EB] last:border-0">
                  <div className="space-y-0.5">
                    <p className="text-sm text-[#2A2A2A]">
                      {started.toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-[#7A7A6A]">
                      OpenAI: {inc.openai_status} · Anthropic: {inc.anthropic_status}
                      {durationMin !== null && ` · Duração: ${durationMin}min`}
                    </p>
                  </div>
                  <Badge className={`text-[10px] border shrink-0 ${
                    inc.resolved_at
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {inc.resolved_at ? "Resolvido" : "Ativo"}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
