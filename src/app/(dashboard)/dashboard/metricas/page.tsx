import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LineChart, Users, Calendar, TrendingUp, MessageSquare, Zap, Home, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

// ── helpers ────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function pct(num: number, den: number) {
  if (den === 0) return "0%"
  return `${Math.round((num / den) * 100)}%`
}

function monthLabel(offsetFromNow: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - offsetFromNow)
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

// ── CSS bar component ───────────────────────────────────────────────────────

function HBar({ label, value, max, color = "#30360E", sub }: {
  label: string
  value: number
  max: number
  color?: string
  sub?: string
}) {
  const pctWidth = max === 0 ? 0 : Math.max(2, Math.round((value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#3A3A3A]">{label}</span>
        <span className="font-medium text-[#30360E] tabular-nums">{value}{sub ? ` ${sub}` : ""}</span>
      </div>
      <div className="h-2 bg-[#E2D4B9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pctWidth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function VBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pctH = max === 0 ? 0 : Math.max(4, Math.round((value / max) * 100))
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-medium text-[#30360E] tabular-nums">{value}</span>
      <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
        <div
          className="w-full rounded-t-sm bg-[#30360E] transition-all"
          style={{ height: `${pctH}%` }}
        />
      </div>
      <span className="text-[10px] text-[#7A7A6A] text-center leading-tight">{label}</span>
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function MetricasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Date windows
  const now = new Date()
  const startOf6Months = new Date(now)
  startOf6Months.setMonth(startOf6Months.getMonth() - 5)
  startOf6Months.setDate(1)
  startOf6Months.setHours(0, 0, 0, 0)

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    { data: allLeads },
    { data: allMessages },
    { data: allVisits },
    { data: allProperties },
    { data: allTransactions },
    { data: recentLeads },
    { data: landlordData },
    { data: socialData },
    { data: approvalData },
  ] = await Promise.all([
    supabase.from("leads").select("id, status, temperature, created_at, estimated_budget, region").eq("user_id", user.id),
    supabase.from("messages").select("id, sender, created_at").eq("user_id", user.id).gte("created_at", startOf6Months.toISOString()),
    supabase.from("visits").select("id, status, scheduled_at").eq("user_id", user.id),
    supabase.from("properties").select("id, active, type, price").eq("user_id", user.id),
    supabase.from("transactions").select("id, commission, closed_at").eq("user_id", user.id),
    supabase.from("leads").select("id, created_at").eq("user_id", user.id).gte("created_at", startOf6Months.toISOString()),
    supabase.from("landlord_profiles").select("id, status, created_at").eq("user_id", user.id),
    supabase.from("social_posts_drafts").select("id, status, created_at").eq("user_id", user.id),
    supabase.from("human_approvals_queue").select("id, resolved_at, created_at").eq("user_id", user.id),
  ])

  const leads = allLeads ?? []
  const messages = allMessages ?? []
  const visits = allVisits ?? []
  const properties = allProperties ?? []
  const transactions = allTransactions ?? []

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const totalLeads = leads.length
  const closedLeads = leads.filter(l => l.status === "fechou").length
  const lostLeads = leads.filter(l => l.status === "perdido").length
  const activeLeads = totalLeads - closedLeads - lostLeads
  const conversionRate = pct(closedLeads, totalLeads)

  const visitasRealizadas = visits.filter(v => v.status === "confirmada" || v.status === "realizada").length
  const visitasTotais = visits.length

  const totalCommission = transactions.reduce((s, t) => s + (t.commission ?? 0), 0)

  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= startOfThisMonth).length
  const lastMonthLeads = leads.filter(l => {
    const d = new Date(l.created_at)
    return d >= startOfLastMonth && d <= endOfLastMonth
  }).length
  const leadGrowth = lastMonthLeads === 0 ? null : Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)

  // ── Funil de conversão ───────────────────────────────────────────────────

  const funnelStages = [
    { label: "Novos", statuses: ["novo"], color: "#7A7A6A" },
    { label: "Qualificados", statuses: ["qualificado", "em_consideracao"], color: "#30360E" },
    { label: "Visitas", statuses: ["visita_agendada", "visitou"], color: "#30360E" },
    { label: "Negociação", statuses: ["em_negociacao"], color: "#787F56" },
    { label: "Fechados", statuses: ["fechou"], color: "#4CAF50" },
  ]
  const funnelData = funnelStages.map(s => ({
    ...s,
    count: leads.filter(l => s.statuses.includes(l.status)).length,
  }))
  const funnelMax = funnelData[0]?.count || 1

  // ── Temperatura ──────────────────────────────────────────────────────────

  const tempData = [
    { label: "Quente", key: "QUENTE", color: "#E74C3C" },
    { label: "Morno", key: "MORNO", color: "#E67E22" },
    { label: "Frio", key: "FRIO", color: "#3498DB" },
    { label: "Inerte", key: "INERTE", color: "#95A5A6" },
  ].map(t => ({
    ...t,
    count: leads.filter(l => l.temperature === t.key).length,
  }))
  const tempMax = Math.max(...tempData.map(t => t.count), 1)

  // ── Leads por mês (últimos 6 meses) ─────────────────────────────────────

  const monthlyLeads = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59)
    const count = (recentLeads ?? []).filter(l => {
      const d = new Date(l.created_at)
      return d >= monthStart && d <= monthEnd
    }).length
    return { label: monthLabel(offset), count }
  })
  const monthlyMax = Math.max(...monthlyLeads.map(m => m.count), 1)

  // ── Mensagens Nara vs Corretor ────────────────────────────────────────────

  const msgNara = messages.filter(m => m.sender === "cora").length
  const msgBroker = messages.filter(m => m.sender === "corretor").length
  const msgTotal = messages.length
  const automationRate = pct(msgNara, msgTotal)

  // ── Aprovações ───────────────────────────────────────────────────────────

  const approvals = approvalData ?? []
  const totalApprovals = approvals.length
  const resolvedApprovals = approvals.filter(a => a.resolved_at != null).length

  // ── Proprietários ────────────────────────────────────────────────────────

  const landlords = landlordData ?? []
  const captados = landlords.filter(l => l.status === "captado" || l.status === "em_publicacao").length

  // ── Posts publicados ─────────────────────────────────────────────────────

  const publishedPosts = (socialData ?? []).filter(s => s.status === "published").length

  // ── Imóveis ativos ────────────────────────────────────────────────────────

  const propAtivos = properties.filter(p => p.active).length
  const propTypes: Record<string, number> = {}
  properties.forEach(p => {
    if (p.type) propTypes[p.type] = (propTypes[p.type] ?? 0) + 1
  })
  const topTypes = Object.entries(propTypes).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topTypeMax = topTypes[0]?.[1] ?? 1

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <LineChart className="w-5 h-5 text-[#787F56]" />
          <h1 className="font-serif text-2xl text-[#30360E]">Painel de Métricas</h1>
        </div>
        <p className="text-sm text-[#7A7A6A]">Performance geral da sua operação — leads, conversões, automação e receita.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#D4C5A0]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#7A7A6A] uppercase tracking-wide font-mono">Total de leads</p>
                <p className="text-3xl font-serif mt-1 text-[#30360E]">{totalLeads}</p>
                {leadGrowth !== null && (
                  <p className={`text-xs mt-1 ${leadGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {leadGrowth >= 0 ? "+" : ""}{leadGrowth}% vs. mês anterior
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-[#30360E]/10">
                <Users className="w-5 h-5 text-[#30360E]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#D4C5A0]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#7A7A6A] uppercase tracking-wide font-mono">Taxa de conversão</p>
                <p className="text-3xl font-serif mt-1 text-[#787F56]">{conversionRate}</p>
                <p className="text-xs text-[#7A7A6A] mt-1">{closedLeads} fechados</p>
              </div>
              <div className="p-2 rounded-lg bg-[#787F56]/10">
                <TrendingUp className="w-5 h-5 text-[#787F56]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#D4C5A0]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#7A7A6A] uppercase tracking-wide font-mono">Visitas realizadas</p>
                <p className="text-3xl font-serif mt-1 text-[#30360E]">{visitasRealizadas}</p>
                <p className="text-xs text-[#7A7A6A] mt-1">{pct(visitasRealizadas, visitasTotais)} do total</p>
              </div>
              <div className="p-2 rounded-lg bg-[#30360E]/10">
                <Calendar className="w-5 h-5 text-[#30360E]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#D4C5A0]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#7A7A6A] uppercase tracking-wide font-mono">Comissão total</p>
                <p className="text-3xl font-serif mt-1 text-[#787F56]">{fmtBRL(totalCommission)}</p>
                <p className="text-xs text-[#7A7A6A] mt-1">{transactions.length} transações</p>
              </div>
              <div className="p-2 rounded-lg bg-[#787F56]/10">
                <TrendingUp className="w-5 h-5 text-[#787F56]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Funil + Temperatura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de conversão */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Funil de conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.map(f => (
              <HBar key={f.label} label={f.label} value={f.count} max={funnelMax} color={f.color} />
            ))}
            <div className="pt-2 border-t border-[#F5F0EB] text-xs text-[#7A7A6A] flex justify-between">
              <span>{activeLeads} leads ativos</span>
              <span>{lostLeads} perdidos</span>
            </div>
          </CardContent>
        </Card>

        {/* Temperatura */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Temperatura dos leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tempData.map(t => (
              <HBar key={t.key} label={t.label} value={t.count} max={tempMax} color={t.color} />
            ))}
            <div className="pt-2 border-t border-[#F5F0EB] text-xs text-[#7A7A6A]">
              {leads.filter(l => !l.temperature).length} leads sem temperatura classificada
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Leads por mês */}
      <Card className="border-[#D4C5A0]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[#30360E] flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Novos leads — últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            {monthlyLeads.map(m => (
              <VBar key={m.label} label={m.label} value={m.count} max={monthlyMax} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 4: Automação Nara + Aprovações + Métricas operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automação Nara */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-[#30360E] flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Automação da Nara
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-serif text-[#787F56]">{automationRate}</p>
              <p className="text-xs text-[#7A7A6A] mt-1">mensagens automáticas</p>
            </div>
            <div className="space-y-2">
              <HBar label="Nara" value={msgNara} max={msgTotal || 1} color="#787F56" />
              <HBar label="Corretor" value={msgBroker} max={msgTotal || 1} color="#30360E" />
            </div>
            <p className="text-xs text-[#7A7A6A] text-center">{msgTotal} msgs (últimos 6 meses)</p>
          </CardContent>
        </Card>

        {/* Aprovações */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-[#30360E] flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Aprovações humanas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-serif text-[#30360E]">{totalApprovals}</p>
              <p className="text-xs text-[#7A7A6A] mt-1">mensagens para revisão</p>
            </div>
            <div className="space-y-2">
              <HBar label="Resolvidas" value={resolvedApprovals} max={totalApprovals || 1} color="#4CAF50" />
              <HBar label="Pendentes" value={totalApprovals - resolvedApprovals} max={totalApprovals || 1} color="#E67E22" />
            </div>
            <p className="text-xs text-[#7A7A6A] text-center">
              {pct(resolvedApprovals, totalApprovals)} taxa de resolução
            </p>
          </CardContent>
        </Card>

        {/* Operacional */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-[#30360E] flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Imóveis ativos", value: propAtivos },
              { label: "Proprietários captados", value: captados },
              { label: "Posts publicados", value: publishedPosts },
              { label: "Visitas agendadas", value: visitasTotais },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#F5F0EB] last:border-0">
                <span className="text-sm text-[#4A4A3A]">{item.label}</span>
                <span className="font-medium text-[#30360E] tabular-nums">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Tipos de imóvel + Comissões mensais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipos de imóvel */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-[#30360E] flex items-center gap-2">
              <Home className="w-4 h-4" />
              Imóveis por tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTypes.length === 0 ? (
              <p className="text-sm text-[#7A7A6A] text-center py-4">Nenhum imóvel cadastrado.</p>
            ) : (
              topTypes.map(([type, count]) => (
                <HBar key={type} label={type} value={count} max={topTypeMax} color="#30360E" sub="imóveis" />
              ))
            )}
          </CardContent>
        </Card>

        {/* Comissões por trimestre */}
        <Card className="border-[#D4C5A0]">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-[#30360E] flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Comissões recebidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-[#7A7A6A] text-center py-4">
                Nenhuma transação registrada ainda.<br />
                <span className="text-xs">Registre fechamentos em <strong>Cobrança</strong> para ver aqui.</span>
              </p>
            ) : (
              (() => {
                const byMonth: Record<string, number> = {}
                transactions.forEach(t => {
                  const key = t.closed_at.slice(0, 7)
                  byMonth[key] = (byMonth[key] ?? 0) + t.commission
                })
                const sorted = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5)
                const maxComm = Math.max(...sorted.map(([, v]) => v), 1)
                return sorted.map(([month, value]) => (
                  <HBar
                    key={month}
                    label={new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                    value={value}
                    max={maxComm}
                    color="#787F56"
                    sub={`(${fmtBRL(value)})`}
                  />
                ))
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
