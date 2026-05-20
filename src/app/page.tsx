import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, MessageSquare, BarChart3, Shield, Zap, Star } from "lucide-react"

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Nara atende 24/7",
    desc: "Sua assistente de IA responde leads no WhatsApp enquanto você está em visita, reunião ou dormindo.",
  },
  {
    icon: Zap,
    title: "Qualificação automática",
    desc: "Classifica cada lead como QUENTE, MORNO, FRIO ou INERTE e define a próxima ação.",
  },
  {
    icon: BarChart3,
    title: "Diagnóstico 14 dias",
    desc: "Nos primeiros 14 dias a Nara prova o que consegue fazer pelo seu negócio, com relatório compartilhável.",
  },
  {
    icon: Shield,
    title: "Pacto Moova 90",
    desc: "Garantia reversa real. Se a Nara não entregar e você fez sua parte, devolvemos até 70% do valor pago.",
  },
]

const STEPS = [
  { step: "01", title: "Conecte o WhatsApp", desc: "Leva 2 minutos. Escaneia o QR e a Nara já começa a atender." },
  { step: "02", title: "Configure o tom", desc: "Formal ou informal. Adicione instruções específicas do seu mercado." },
  { step: "03", title: "Importe sua base", desc: "Upload CSV com seus leads. A Nara começa a trabalhar na hora." },
  { step: "04", title: "Acompanhe no painel", desc: "Pipeline em tempo real, aprovação de mensagens, relatórios." },
]

const PLANS = [
  {
    name: "Moova Starter",
    price: "R$ 799",
    period: "/mês",
    provider: "Evolution API",
    items: ["Nara ativa 24/7", "Diagnóstico 14 dias", "Pacto Moova 90", "Pipeline e CRM", "Importação CSV", "Aprovação humana"],
    cta: "Começar agora",
    highlight: false,
  },
  {
    name: "Moova Pro",
    price: "R$ 1.199",
    period: "/mês",
    provider: "BSP Oficial (em breve)",
    items: ["Tudo do Starter", "BSP oficial (maior estabilidade)", "Voz da Nara personalizada", "Suporte prioritário", "Relatório Stories 9:16", "API de integração"],
    cta: "Entrar na lista de espera",
    highlight: true,
  },
]

const FAQ = [
  {
    q: "A Nara finge ser humana?",
    a: "Não. A Nara sempre se apresenta como assistente de IA e informa quando o corretor será acionado. É uma regra inviolável do sistema.",
  },
  {
    q: "Como funciona a aprovação humana?",
    a: "Nos primeiros 30 dias, mensagens sobre visita, valor, contraproposta ou fechamento passam por você antes de enviar. Você aprova ou rejeita diretamente no painel.",
  },
  {
    q: "E se a Cora errar algo?",
    a: "Você pode assumir qualquer conversa a qualquer momento e devolver para a Nara quando quiser.",
  },
  {
    q: "O Pacto Moova 90 é de verdade?",
    a: "Sim. Se você seguiu o programa e não atingiu a meta, devolvemos até 70% do valor investido nos 3 meses. Os cenários A/B/C/D são calculados com base em métricas verificáveis.",
  },
  {
    q: "Preciso saber programar?",
    a: "Zero. O onboarding é feito pelo painel em menos de 10 minutos.",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F0E0]">
      {/* Nav */}
      <nav className="border-b border-[#D4C5A0] bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#787F56] rounded-full" />
            <span className="font-serif text-xl text-[#30360E]">Moova</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#4A4A3A] hover:text-[#30360E]">Entrar</Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "bg-[#30360E] hover:bg-[#4A5218] text-white")}>
              Solicitar acesso
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-[#30360E]/10 text-[#30360E] text-xs px-4 py-1.5 rounded-full font-medium">
          <Star className="w-3.5 h-3.5" />
          Beta exclusivo para corretores brasileiros
        </div>
        <h1 className="font-serif text-5xl lg:text-6xl text-[#30360E] leading-tight max-w-3xl mx-auto">
          A nova infraestrutura do corretor brasileiro
        </h1>
        <p className="text-[#4A4A3A] text-lg max-w-xl mx-auto leading-relaxed">
          A Nara atende seus leads no WhatsApp 24 horas por dia, qualifica, agenda visitas e te avisa só quando é a hora de fechar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-[#30360E] hover:bg-[#4A5218] text-white text-base")}>
            Começar diagnóstico gratuito
          </Link>
          <Link href="#como-funciona" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-[#D4C5A0] text-[#30360E] text-base")}>
            Ver como funciona
          </Link>
        </div>
        <p className="text-xs text-[#7A7A6A]">14 dias de diagnóstico · Sem cartão de crédito</p>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-[#D4C5A0] py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-3">
                <div className="w-10 h-10 bg-[#30360E]/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#30360E]" />
                </div>
                <h3 className="font-medium text-[#2A2A2A]">{title}</h3>
                <p className="text-sm text-[#4A4A3A] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-2">
          <p className="text-xs text-[#787F56] uppercase tracking-widest font-mono">Como funciona</p>
          <h2 className="font-serif text-3xl text-[#30360E]">Do cadastro ao primeiro lead atendido em 10 minutos</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map(({ step, title, desc }) => (
            <div key={step} className="space-y-3">
              <span className="font-mono text-[#787F56] text-2xl font-bold">{step}</span>
              <h3 className="font-medium text-[#2A2A2A]">{title}</h3>
              <p className="text-sm text-[#4A4A3A] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nara Constitution destaque */}
      <section className="bg-[#30360E] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <p className="text-[#787F56] text-xs uppercase tracking-widest font-mono">Nara Constitution</p>
          <h2 className="font-serif text-3xl text-white">A Nara nunca inventa, nunca pressiona, nunca mente</h2>
          <p className="text-[#B0D0C0] leading-relaxed">
            Três atributos não-negociáveis: <strong className="text-white">Precisa</strong> (informação certa, fonte clara),
            {" "}<strong className="text-white">Calorosa</strong> (tom humano, brasileiro, sem corporativês),
            {" "}<strong className="text-white">Direta</strong> (não enrola, respeita o tempo do lead).
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {["Nunca finge ser humana", "Nunca inventa dados", "Nunca pressiona sem instrução", "Max 1 emoji/mensagem"].map((r) => (
              <span key={r} className="flex items-center gap-1.5 text-[#8AC0A8]">
                <CheckCircle2 className="w-4 h-4 text-[#787F56]" />
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="precos" className="max-w-5xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-2">
          <p className="text-xs text-[#787F56] uppercase tracking-widest font-mono">Planos</p>
          <h2 className="font-serif text-3xl text-[#30360E]">Simples e direto</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-8 space-y-6 ${plan.highlight ? "border-[#787F56] bg-white shadow-lg" : "border-[#D4C5A0] bg-white"}`}>
              {plan.highlight && (
                <div className="text-[10px] font-bold text-[#787F56] uppercase tracking-widest">Mais popular</div>
              )}
              <div>
                <h3 className="font-serif text-xl text-[#30360E]">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-bold text-3xl text-[#2A2A2A]">{plan.price}</span>
                  <span className="text-[#7A7A6A] text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-[#7A7A6A] mt-1">{plan.provider}</p>
              </div>
              <ul className="space-y-2">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                    <CheckCircle2 className="w-4 h-4 text-[#30360E] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={cn(buttonVariants(), "w-full justify-center", plan.highlight ? "bg-[#787F56] hover:bg-[#9A6025] text-white" : "bg-[#30360E] hover:bg-[#4A5218] text-white")}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#7A7A6A]">
          Pagamento via Pix, boleto ou cartão. Asaas · Seguro e transparente.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-[#D4C5A0] py-16">
        <div className="max-w-2xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl text-[#30360E]">Perguntas frequentes</h2>
          </div>
          <div className="divide-y divide-[#D4C5A0]">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="py-5 space-y-2">
                <p className="font-medium text-[#2A2A2A]">{q}</p>
                <p className="text-sm text-[#4A4A3A] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="font-serif text-4xl text-[#30360E] max-w-xl mx-auto">
          Sua Nara está pronta. Seus leads estão esperando.
        </h2>
        <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-[#30360E] hover:bg-[#4A5218] text-white text-base px-10")}>
          Solicitar acesso ao beta
        </Link>
        <p className="text-xs text-[#7A7A6A]">14 dias · Sem cartão · Pacto Moova 90 incluso</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D4C5A0] py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7A6A]">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 bg-[#787F56] rounded-full" />
            <span className="font-serif text-[#30360E]">Moova</span>
          </div>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-[#30360E]">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-[#30360E]">Privacidade</Link>
            <a href="mailto:contato@moova.com.br" className="hover:text-[#30360E]">Contato</a>
          </div>
          <p>© 2026 Moova. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  )
}
