import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, CheckCircle2, TrendingUp, Newspaper } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function NewsletterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: sub }, { data: logs }] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single(),
    supabase.from("newsletter_logs")
      .select("id, edition_date, subject, sent_at, opened_at, total_recipients")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(20),
  ])

  const isEligible = ["opera", "inteligencia", "maestria"].includes(sub?.plan ?? "")
  const totalSent = logs?.length ?? 0
  const totalOpened = (logs ?? []).filter(l => l.opened_at).length

  const PREVIEW_CONTENT = [
    { emoji: "📊", title: "SELIC e Financiamento", text: "Impacto da taxa atual nos financiamentos imobiliários — análise semanal para você repassar aos clientes." },
    { emoji: "🏗️", title: "Mercado em Movimento", text: "Tendências de MCMV, alto padrão, retrofit e oportunidades regionais da semana." },
    { emoji: "📱", title: "Dica da Semana", text: "Tática prática de captação, produtividade ou atendimento para colocar em prática ainda hoje." },
    { emoji: "📈", title: "Número da Semana", text: "Uma estatística relevante do mercado imobiliário brasileiro com fonte citada." },
    { emoji: "💡", title: "Para Refletir", text: "Insight direto da Cora sobre vendas, relacionamento ou mentalidade de corretor de sucesso." },
  ]

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Cora me Conta</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Newsletter semanal de inteligência de mercado imobiliário</p>
      </div>

      {/* Eligibility */}
      {!isEligible && (
        <Card className="border-[#D4C5A0] bg-[#F5F0E0]">
          <CardContent className="p-5 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-[#787F56] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#30360E]">Disponível no plano Opera e superiores</p>
              <p className="text-sm text-[#4A4A3A] mt-1">
                A newsletter Cora me Conta é enviada toda segunda-feira para assinantes Opera, Inteligência e Maestria.
                Faça upgrade para receber curadoria semanal de mercado direto no seu email.
              </p>
              <a href="/dashboard/planos" className="inline-block mt-3 text-sm text-white bg-[#30360E] hover:bg-[#4A5218] px-4 py-2 rounded-lg transition-colors">
                Ver planos
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {isEligible && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#30360E] rounded-xl p-4">
            <p className="text-[10px] text-[#B0C080] uppercase tracking-widest">Cadência</p>
            <p className="text-2xl font-bold text-white mt-1">Semanal</p>
            <p className="text-xs text-[#B0C080] mt-0.5">toda segunda às 7h</p>
          </div>
          <div className="bg-[#EEF0E8] rounded-xl p-4">
            <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Edições enviadas</p>
            <p className="text-2xl font-bold text-[#30360E] mt-1">{totalSent}</p>
            <p className="text-xs text-[#7A7A6A] mt-0.5">até hoje</p>
          </div>
          {totalSent > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-[10px] text-green-600 uppercase tracking-widest">Taxa de abertura</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {totalSent > 0 ? `${Math.round((totalOpened / totalSent) * 100)}%` : "—"}
              </p>
              <p className="text-xs text-green-600 mt-0.5">{totalOpened} de {totalSent}</p>
            </div>
          )}
        </div>
      )}

      {/* Newsletter preview */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg text-[#30360E]">Formato da newsletter</h2>
        <div className="border border-[#D4C5A0] rounded-2xl overflow-hidden">
          <div className="bg-white p-6 border-b border-[#D4C5A0]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-[#787F56] rounded-full" />
              <span className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Moova</span>
            </div>
            <h3 className="font-serif text-xl text-[#30360E]">Cora me Conta</h3>
            <p className="text-xs text-[#7A7A6A] mt-0.5">Curadoria semanal de mercado imobiliário</p>
          </div>
          <div className="bg-[#FAFAF8] p-6 space-y-4">
            {PREVIEW_CONTENT.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{item.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-[#30360E] uppercase tracking-wide">{item.title}</p>
                  <p className="text-sm text-[#4A4A3A] mt-0.5 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-[#E2D4B9] text-xs text-[#7A7A6A]">
              Gerada pela Cora · Moova · <span className="text-[#787F56]">moovaimob.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sent history */}
      {(logs?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-[#30360E]">Histórico de envios</h2>
          <div className="space-y-2">
            {(logs ?? []).map(log => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-white border border-[#D4C5A0] rounded-xl">
                <div className="flex items-center gap-3">
                  <Newspaper className="w-4 h-4 text-[#787F56]" />
                  <div>
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      {log.subject ?? `Edição de ${new Date(log.edition_date).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`}
                    </p>
                    <p className="text-xs text-[#7A7A6A]">
                      {new Date(log.sent_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {log.opened_at && (
                    <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aberta
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-[#7A7A6A]">
                    <Mail className="w-3 h-3" />
                    <span>{log.total_recipients}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEligible && (logs?.length ?? 0) === 0 && (
        <div className="text-center py-16 text-[#7A7A6A]">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma newsletter enviada ainda</p>
          <p className="text-xs mt-1">A primeira edição será enviada na próxima segunda-feira às 7h</p>
        </div>
      )}
    </div>
  )
}
