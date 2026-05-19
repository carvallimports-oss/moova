import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Star, Shield, Users, MessageSquare } from "lucide-react"

const BENEFITS_ONDA1 = [
  "6 meses de Moova Atende grátis",
  "Acesso vitalício ao Círculo Moova",
  "Selo 'Fundador Moova' para Instagram bio",
  "Co-criação registrada em moova.com.br/fundadores",
  "Kit digital com identidade de marca",
  "Carta física assinada pelo fundador",
]

const BENEFITS_ONDA2 = [
  "3 meses de Moova Atende grátis",
  "Acesso vitalício ao Círculo Moova",
  "Selo 'Fundador Moova' para Instagram bio",
  "Co-criação registrada em moova.com.br/fundadores",
  "Kit digital com identidade de marca",
]

const FUNDADORES = [
  { wave: "Onda 1", slots: 3, benefits: BENEFITS_ONDA1, highlight: true },
  { wave: "Onda 2", slots: 10, benefits: BENEFITS_ONDA2, highlight: false },
]

export default function FundadoresPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      {/* Nav */}
      <nav className="border-b border-[#E0D8CE] bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#B87333] rounded-full" />
            <span className="font-serif text-xl text-[#2D4A3E]">Moova</span>
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white")}>
            Solicitar acesso
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-5">
        <div className="inline-flex items-center gap-2 bg-[#B87333]/10 text-[#B87333] text-xs px-4 py-1.5 rounded-full font-medium">
          <Star className="w-3.5 h-3.5" />
          Programa Fundadores Moova
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl text-[#2D4A3E] leading-tight">
          Você não vai assinar um SaaS.<br />Vai construir um com a gente.
        </h1>
        <p className="text-[#5A5A5A] text-lg max-w-2xl mx-auto leading-relaxed">
          Os Fundadores Moova são os primeiros corretores a testar, quebrar, questionar e moldar o produto. Em troca, recebem benefícios que nenhum outro plano terá.
        </p>
      </section>

      {/* What it means */}
      <section className="bg-[#2D4A3E] py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-8 text-center text-white">
            {[
              { icon: MessageSquare, title: "Feedback direto", desc: "Seu WhatsApp vai para o fundador. Bugs, ideias e reclamações têm resposta em 24h." },
              { icon: Shield, title: "Pacto estendido", desc: "Onda 1 tem Pacto Moova 90 com condições exclusivas — não disponíveis no plano público." },
              { icon: Users, title: "Crédito real", desc: "Seu nome e caso aparecem em moova.com.br/fundadores. Não como testemunho — como co-criador." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
                  <Icon className="w-5 h-5 text-[#B87333]" />
                </div>
                <h3 className="font-medium text-white">{title}</h3>
                <p className="text-sm text-[#B0D0C0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waves */}
      <section className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs text-[#B87333] uppercase tracking-widest font-mono">As ondas</p>
          <h2 className="font-serif text-3xl text-[#2D4A3E]">Dois grupos, critérios diferentes</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {FUNDADORES.map((wave) => (
            <div
              key={wave.wave}
              className={`rounded-2xl border p-8 space-y-6 ${wave.highlight ? "border-[#B87333] bg-white shadow-lg" : "border-[#E0D8CE] bg-white"}`}
            >
              {wave.highlight && (
                <div className="text-[10px] font-bold text-[#B87333] uppercase tracking-widest">Hand-picked pelo fundador</div>
              )}
              <div>
                <h3 className="font-serif text-2xl text-[#2D4A3E]">{wave.wave}</h3>
                <p className="text-sm text-[#8A8A8A] mt-1">{wave.slots} vagas · Seleção manual</p>
              </div>
              <ul className="space-y-2.5">
                {wave.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-[#3A3A3A]">
                    <Star className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants(),
                  "w-full justify-center",
                  wave.highlight ? "bg-[#B87333] hover:bg-[#9A6025] text-white" : "bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white"
                )}
              >
                Solicitar vaga
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#8A8A8A]">
          Critérios: CRECI ativo ≥ 6 meses · 1+ venda comprovada · 100+ contatos WhatsApp · disponibilidade para feedback semanal
        </p>
      </section>

      {/* Origin Cora */}
      <section className="bg-white border-y border-[#E0D8CE] py-12">
        <div className="max-w-2xl mx-auto px-6 text-center space-y-5">
          <p className="text-xs text-[#B87333] uppercase tracking-widest font-mono">A origem da Nara</p>
          <blockquote className="font-serif text-lg text-[#2D4A3E] leading-relaxed">
            &ldquo;A Nara foi desenhada num sábado à noite, depois que um corretor parceiro perdeu um fechamento de R$ 1,8 milhão porque o WhatsApp dele tinha 47 mensagens não lidas no domingo de manhã. A regra de design foi simples: a Nara precisa atender o lead como o melhor estagiário que o corretor já teve — preciso, caloroso, direto — e nunca, nunca soar como robô de banco.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-5">
        <h2 className="font-serif text-3xl text-[#2D4A3E]">Ainda tem vagas?</h2>
        <p className="text-[#5A5A5A] max-w-md mx-auto">
          Manda um email ou solicite pelo formulário. A resposta sobre a seleção chega em até 48h úteis.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white")}>
            Solicitar vaga de Fundador
          </Link>
          <a
            href="mailto:fundadores@moova.com.br"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-[#E0D8CE] text-[#2D4A3E]")}
          >
            Escrever direto
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E0D8CE] py-6">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-[#8A8A8A]">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3.5 bg-[#B87333] rounded-full" />
            <span className="font-serif text-[#2D4A3E]">Moova</span>
          </div>
          <Link href="/" className="hover:text-[#2D4A3E]">← Voltar ao site</Link>
        </div>
      </footer>
    </main>
  )
}
