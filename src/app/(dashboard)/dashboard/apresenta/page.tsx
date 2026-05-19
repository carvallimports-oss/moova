import { Lock, UserCheck, TrendingUp, Shield } from "lucide-react"

export const dynamic = "force-dynamic"

export default function ApresentaPage() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-5 h-5 text-[#B87333]" />
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Cora me Apresenta</h1>
        </div>
        <p className="text-sm text-[#8A8A8A]">Insights de perfil financeiro do comprador — com consentimento explícito.</p>
      </div>

      <div className="bg-white border border-[#E0D8CE] rounded-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-[#EAE3D9] rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-[#B87333]" />
        </div>
        <div>
          <h2 className="font-serif text-xl text-[#2D4A3E] mb-2">Parceria Serasa em andamento</h2>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            O módulo <strong>Cora me Apresenta</strong> depende de parceria oficial com a Serasa Experian como reseller autorizado.
            A negociação está em andamento (prazo estimado: 4-6 meses).
          </p>
        </div>

        <div className="bg-[#FAF7F2] rounded-xl p-6 text-left space-y-4">
          <p className="text-xs font-semibold text-[#2D4A3E] uppercase tracking-wide">O que vai incluir</p>
          {[
            { icon: UserCheck, text: "Insights de perfil financeiro do comprador — sem expor score bruto" },
            { icon: TrendingUp, text: "Estimativa de capacidade de financiamento (\"compatível com até R$ 600k\")" },
            { icon: Shield, text: "Consentimento explícito LGPD + Open Finance via Belvo" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#B87333] mt-0.5 shrink-0" />
              <p className="text-sm text-[#5A5A5A]">{text}</p>
            </div>
          ))}
        </div>

        <div className="text-xs text-[#8A8A8A] bg-[#EAE3D9] rounded-lg p-4 text-left">
          <span className="font-medium text-[#5A5A5A]">Por que não lançar sem a parceria?</span>{" "}
          Consultar dados de crédito sem autorização do Banco Central é risco regulatório severo. A Moova prioriza blindagem legal sobre velocidade.
          Quando a parceria for fechada, este módulo estará pronto para ativar.
        </div>
      </div>
    </div>
  )
}
