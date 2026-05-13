import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MessageSquare,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react"

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
    <Card className="border-[#E0D8CE]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#8A8A8A] uppercase tracking-wide font-mono">{title}</p>
            <p className={`text-3xl font-serif mt-1 ${accent ? "text-[#B87333]" : "text-[#2D4A3E]"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-[#8A8A8A] mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accent ? "bg-[#B87333]/10" : "bg-[#2D4A3E]/10"}`}>
            <Icon className={`w-5 h-5 ${accent ? "text-[#B87333]" : "text-[#2D4A3E]"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: leadsHoje },
    { count: visitasAgendadas },
    { data: diagnostico },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("visits").select("*", { count: "exact", head: true })
      .eq("user_id", user!.id).eq("confirmed", false),
    supabase.from("diagnostico_cora_14d").select("*")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).single(),
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

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Início</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Diagnóstico banner */}
      {diagnosticoAtivo && (
        <Card className="border-[#B87333]/30 bg-gradient-to-r from-[#B87333]/5 to-[#2D4A3E]/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#B87333]" />
                  <span className="text-sm font-medium text-[#2D4A3E]">Diagnóstico Cora 14 Dias</span>
                  <Badge className="bg-[#B87333]/10 text-[#B87333] text-[10px] border-0">
                    {diasRestantes} dias restantes
                  </Badge>
                </div>
                <Progress value={progressoPct} className="h-1.5 bg-[#E0D8CE]" />
                <div className="flex gap-6 mt-3 text-sm">
                  <span className="text-[#5A5A5A]">
                    <strong className="text-[#2D4A3E]">{diagnosticoAtivo.leads_attended}</strong> leads atendidos
                  </span>
                  <span className="text-[#5A5A5A]">
                    <strong className="text-[#2D4A3E]">{diagnosticoAtivo.visits_scheduled}</strong> visitas agendadas
                  </span>
                  <span className="text-[#5A5A5A]">
                    <strong className="text-[#B87333]">
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
        <StatCard title="Total de leads" value={leadsHoje ?? 0} icon={Users} />
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

      {/* Status Cora */}
      <Card className="border-[#E0D8CE]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#2D4A3E] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Cora — Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5A5A5A]">OpenAI GPT-4o</span>
            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Operando</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5A5A5A]">Anthropic Claude (fallback)</span>
            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Operando</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5A5A5A]">WhatsApp (Evolution API)</span>
            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Aguardando conexão</Badge>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Configure o WhatsApp em Configurações para a Cora começar a atender.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
