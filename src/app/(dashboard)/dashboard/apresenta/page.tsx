import { Lock, UserCheck, TrendingUp, Shield } from "lucide-react"

export const dynamic = "force-dynamic"

export default function ApresentaPage() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-5 h-5 text-[#787F56]" />
          <h1 className="font-serif text-2xl text-[#30360E]">Cora me Apresenta</h1>
        </div>
        <p className="text-sm text-[#7A7A6A]">Insights de perfil financeiro do comprador — com consentimento explícito.</p>
      </div>

      <div className="bg-white border border-[#D4C5A0] rounded-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-[#E2D4B9] rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-[#787F56]" />
        </div>
        <div>
          <h2 className="font-serif text-xl text-[#30360E] mb-2">Parceria Serasa em andamento</h2>
          <p className="text-sm text-[#4A4A3A] leading-relaxed">
            O módulo <strong>Cora me Apresenta</strong> depende de parceria oficial com a Serasa Experian como reseller autorizado.
            A negociação está em andamento (prazo estimado: 4-6 meses).
          </p>
        </div>

        <div className="bg-[#F5F0E0] rounded-xl p-6 text-left space-y-4">
          <p className="text-xs font-semibold text-[#30360E] uppercase tracking-wide">O que vai incluir</p>
          {[
            { icon: UserCheck, text: "Insights de perfil financeiro do comprador — sem expor score bruto" },
            { icon: TrendingUp, text: "Estimativa de capacidade de financiamento (\"compatível com até R$ 600k\")" },
            { icon: Shield, text: "Consentimento explícito LGPD + Open Finance via Belvo" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#787F56] mt-0.5 shrink-0" />
              <p className="text-sm text-[#4A4A3A]">{text}</p>
            </div>
          ))}
        </div>

        <div className="text-xs text-[#7A7A6A] bg-[#E2D4B9] rounded-lg p-4 text-left">
          <span className="font-medium text-[#4A4A3A]">Por que não lançar sem a parceria?</span>{" "}
          Consultar dados de crédito sem autorização do Banco Central é risco regulatório severo. A Moova prioriza blindagem legal sobre velocidade.
          Quando a parceria for fechada, este módulo estará pronto para ativar.
        </div>
      </div>
    </div>
  )
}
