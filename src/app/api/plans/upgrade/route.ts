import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const PLANS = [
  {
    id: "opera",
    name: "Moova Opera",
    price: 1299,
    tagline: "Estrutura operacional da imobiliária unipessoal.",
    features: [
      "CRM Duplo — pipeline comprador + proprietário",
      "Moova Portal — seu site profissional com IA",
      "Moova Estúdio — descrição IA por imóvel",
      "Publicação assistida em redes sociais",
      "Diário do Imóvel — relatório semanal para proprietários",
      "Integração com portais (ZAP, VivaReal, Imovelweb, Chaves na Mão)",
    ],
    highlight: false,
  },
  {
    id: "inteligencia",
    name: "Moova Inteligência",
    price: 1799,
    tagline: "Inteligência expandida + captação limpa.",
    features: [
      "Tudo do Opera +",
      "Cora me Apresenta — insights de crédito do comprador",
      "Cora me Conta — curadoria de mercado semanal",
      "Cora me Treina — coach de negociação em tempo real",
      "Cora me Defende — suporte jurídico IA",
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
    features: [
      "Tudo do Inteligência +",
      "Moova Vistoria — relatório técnico de apoio",
      "Moova Estimativa — CMA por imóvel",
      "Pacto Maestria — se não render R$ 90k em 6 meses, descemos pra Inteligência sem fricção",
      "Círculo Moova Maestria — eventos físicos trimestrais e mentoria C-Level",
    ],
    highlight: false,
    pacto: true,
  },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  const currentPlan = subscription?.plan ?? "evolution"

  const planOrder = ["evolution", "bsp", "opera", "inteligencia", "maestria"]
  const currentIndex = planOrder.indexOf(currentPlan)

  const availablePlans = PLANS.filter((p) => planOrder.indexOf(p.id) > currentIndex)

  return NextResponse.json({ currentPlan, availablePlans })
}
