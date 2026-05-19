"use client"

import { cn } from "@/lib/utils"
import { Check, ShieldCheck, Sparkles, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

const PLANS = [
  {
    id: "opera",
    name: "Moova Opera",
    price: 1299,
    tagline: "Estrutura operacional da imobiliária unipessoal.",
    icon: Sparkles,
    features: [
      "CRM Duplo — pipeline comprador + proprietário",
      "Moova Portal — seu site profissional gerado por IA",
      "Moova Estúdio — descrição de imóvel com IA",
      "Publicação assistida em redes sociais",
      "Diário do Imóvel — atualização semanal para proprietários",
      "Integração unidirecional com ZAP, VivaReal, Imovelweb e Chaves na Mão",
    ],
    highlight: false,
  },
  {
    id: "inteligencia",
    name: "Moova Inteligência",
    price: 1799,
    tagline: "Inteligência expandida + captação limpa.",
    icon: Star,
    features: [
      "Tudo do Opera, mais:",
      "Cora me Apresenta — insights de crédito do comprador",
      "Cora me Conta — curadoria de mercado toda semana",
      "Cora me Treina — coach de negociação em tempo real",
      "Cora me Defende — dúvidas jurídicas respondidas pela IA",
      "Moova Captação — prospecção opt-in de proprietários",
      "Serviços Extras — gestão de serviços paralelos",
    ],
    highlight: true,
  },
  {
    id: "maestria",
    name: "Moova Maestria",
    price: 2499,
    tagline: "Premium blindados — vistoria e estimativa.",
    icon: ShieldCheck,
    features: [
      "Tudo do Inteligência, mais:",
      "Moova Vistoria de apoio — relatório técnico por imóvel",
      "Moova Estimativa — CMA por imóvel",
      "Círculo Moova Maestria — eventos físicos e mentoria C-Level",
      "Pacto Maestria: sem R$ 90k em 6 meses, voltamos pro Inteligência sem friç'ao",
    ],
    highlight: false,
    pacto: true,
  },
]

const PLAN_ORDER = ["evolution", "bsp", "opera", "inteligencia", "maestria"]

function PlanCard({ plan, isAvailable, isCurrent }: { plan: typeof PLANS[0]; isAvailable: boolean; isCurrent: boolean }) {
  const Icon = plan.icon

  return (
    <div className={cn(
      "relative bg-white border rounded-2xl p-6 flex flex-col",
      plan.highlight ? "border-[#2D4A3E] shadow-lg" : "border-[#E0D8CE]",
      !isAvailable && !isCurrent && "opacity-60"
    )}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-[#2D4A3E] text-white text-xs font-medium px-3 py-1 rounded-full">Mais popular</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          plan.highlight ? "bg-[#2D4A3E]" : "bg-[#EAE3D9]"
        )}>
          <Icon className={cn("w-5 h-5", plan.highlight ? "text-white" : "text-[#2D4A3E]")} />
        </div>
        <div>
          <h3 className="font-serif text-lg text-[#2D4A3E]">{plan.name}</h3>
          <p className="text-xs text-[#8A8A8A]">{plan.tagline}</p>
        </div>
      </div>

      <div className="mb-5">
        <span className="font-serif text-3xl text-[#2D4A3E]">R$ {plan.price.toLocaleString("pt-BR")}</span>
        <span className="text-sm text-[#8A8A8A]">/mês</span>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
            <Check className="w-4 h-4 text-[#2D4A3E] shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {("pacto" in plan) && (
        <div className="bg-[#EAE3D9] rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-[#2D4A3E] mb-1">Pacto Maestria</p>
          <p className="text-xs text-[#5A5A5A] leading-relaxed">
            Se em 6 meses você não rodar R$ 90k em comissão adicional, descemos pro Inteligência automaticamente. Sem ligação difícil.
          </p>
        </div>
      )}

      {isCurrent ? (
        <div className="text-center py-2.5 bg-[#EAE3D9] rounded-xl text-sm font-medium text-[#2D4A3E]">
          Plano atual
        </div>
      ) : isAvailable ? (
        <Button
          className={cn(
            "w-full",
            plan.highlight
              ? "bg-[#2D4A3E] hover:bg-[#1e3329] text-white"
              : "border border-[#2D4A3E] text-[#2D4A3E] bg-white hover:bg-[#EAE3D9]"
          )}
          variant={plan.highlight ? "default" : "outline"}
          onClick={() => window.open("https://wa.me/5511999999999?text=Quero%20fazer%20upgrade%20para%20o%20" + encodeURIComponent(plan.name), "_blank")}
        >
          Quero o {plan.name}
        </Button>
      ) : (
        <div className="text-center py-2.5 text-xs text-[#8A8A8A]">
          Disponível após planos anteriores
        </div>
      )}
    </div>
  )
}

export function PlansClient({ currentPlan }: { currentPlan: string }) {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan)

  return (
    <div className="space-y-6">
      <div className="bg-[#EAE3D9] rounded-xl p-4 text-sm text-[#5A5A5A]">
        <span className="font-medium text-[#2D4A3E]">Como funciona o upgrade?</span>{" "}
        A Cora vai te avisar quando identificar que você está pronto para o próximo nível —
        por volume de operações, ROI e engajamento. Para upgrades manuais, entre em contato com o suporte.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const planIndex = PLAN_ORDER.indexOf(plan.id)
          const isCurrent = plan.id === currentPlan
          const isAvailable = planIndex > currentIndex

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAvailable={isAvailable}
              isCurrent={isCurrent}
            />
          )
        })}
      </div>

      <p className="text-xs text-center text-[#8A8A8A]">
        Todos os planos incluem o Moova Atende (Cora 24/7, Diagnóstico 14 dias, Pacto Moova 90).
        Cobrança via Asaas — Pix, boleto ou cartão.
      </p>
    </div>
  )
}
