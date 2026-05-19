"use client"

import { useState } from "react"
import { ChevronDown, MessageCircle, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

type FAQItem = { q: string; a: string }

const SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: "Sobre a Nara",
    items: [
      {
        q: "O que é a Nara?",
        a: "A Nara é a IA assistente da Moova. Ela atende seus leads pelo WhatsApp 24/7, qualifica o interesse, agenda visitas e faz follow-up — tudo respeitando o seu estilo de comunicação.",
      },
      {
        q: "A Nara vai se identificar como IA para o lead?",
        a: "Sim, sempre. Na primeira mensagem de cada lead, a Nara envia um disclaimer automático informando que é uma assistente de IA do corretor. Se o lead perguntar diretamente, ela confirma e oferece falar com você na hora.",
      },
      {
        q: "Posso pegar a conversa de volta a qualquer momento?",
        a: "Sim. Em Conversas, clique em \"Assumir conversa\" em qualquer thread. A Nara para de responder automaticamente e a conversa fica exclusivamente com você.",
      },
      {
        q: "O que a Nara nunca faz?",
        a: "A Nara nunca inventa informações sobre imóveis, nunca promete preço ou prazo sem sua autorização, nunca continua conversando após opt-out do lead, e nunca sai do escopo imobiliário.",
      },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      {
        q: "Meu WhatsApp continua funcionando normalmente?",
        a: "Sim. Você continua usando seu celular normalmente. A Nara opera via um dispositivo vinculado — o mesmo mecanismo dos aplicativos de WhatsApp Web.",
      },
      {
        q: "O que é o modo degradado?",
        a: "Se a IA ficar indisponível por mais de 60 segundos, a Nara entra em modo degradado: envia uma mensagem padrão ao lead avisando que o corretor está ocupado, e guarda todas as mensagens para reprocessar quando a IA voltar. Nenhum lead é perdido silenciosamente.",
      },
      {
        q: "O que acontece se meu WhatsApp desconectar?",
        a: "Você será notificado por email. Reconecte em Configurações → WhatsApp escaneando o QR Code novamente. A Nara retoma automaticamente.",
      },
    ],
  },
  {
    title: "Diagnóstico 14 Dias",
    items: [
      {
        q: "O que é o Diagnóstico Nara 14 Dias?",
        a: "É o período inicial em que a Nara opera na sua base de leads antes de qualquer cobrança. Ao final dos 14 dias, você recebe um relatório detalhado com leads atendidos, visitas agendadas e comissão potencial estimada.",
      },
      {
        q: "Como compartilho o relatório?",
        a: "Em Diagnóstico, clique em \"Compartilhar\". O sistema gera um link público e uma versão Stories 9:16 pronta para o Instagram — sem precisar de design.",
      },
      {
        q: "O Diagnóstico começa automaticamente?",
        a: "Sim. Assim que você finaliza o onboarding, o contador de 14 dias inicia. O progresso fica visível na barra lateral (ex: 3/14).",
      },
    ],
  },
  {
    title: "Pacto Moova 90",
    items: [
      {
        q: "O que é o Pacto Moova 90?",
        a: "É nossa garantia reversa: se em 90 dias você não fechar R$ 50k em comissão jogando limpo (visitas feitas, escalações respondidas em até 4h, leads quentes aceitos), devolvemos 70% do que pagou. Tudo está escrito no contrato em linguagem humana.",
      },
      {
        q: "Como é calculada a comissão no Pacto?",
        a: "Você registra cada fechamento em Pacto 90 → Fechamentos. O sistema acumula automaticamente e mostra o progresso na barra até R$ 50k.",
      },
      {
        q: "O que é 'jogar limpo' no Pacto?",
        a: "Jogar limpo significa: comparecer a ≥80% das visitas agendadas pela Nara, responder escalações urgentes em até 4h em ≥70% dos casos, e aceitar leads quentes sem recusar sem justificativa.",
      },
    ],
  },
  {
    title: "Cobrança",
    items: [
      {
        q: "Quando começa a cobrança?",
        a: "Somente após os 14 dias do Diagnóstico, se você optar por continuar. O plano custa R$ 799/mês (Evolution API).",
      },
      {
        q: "Como cancelo?",
        a: "Em Cobrança, clique em \"Cancelar assinatura\". O acesso continua até o fim do período pago. Não há fidelidade mínima além dos 90 dias do Pacto.",
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Pix, boleto bancário e cartão de crédito, via Asaas.",
      },
    ],
  },
  {
    title: "LGPD e Privacidade",
    items: [
      {
        q: "Como o lead pede para não ser mais contactado?",
        a: "O lead pode enviar \"não quero mais contato\", \"me tire desta lista\" ou expressões similares. A Nara reconhece automaticamente, para de responder e registra o opt-out. O lead pode revogar pedindo contato novamente.",
      },
      {
        q: "Como exporto ou excluo os dados de um lead?",
        a: "Em Leads, abra o lead e use os botões \"Exportar dados (LGPD)\" ou \"Anonimizar dados (LGPD)\". A exportação retorna um JSON com todos os dados. A anonimização apaga os dados pessoais imediatamente.",
      },
      {
        q: "Como removo minha voz clonada?",
        a: "Em Configurações → Voz da Nara, clique em \"Remover voz\". A deleção no ElevenLabs ocorre em até 48h úteis.",
      },
      {
        q: "Quem é o DPO da Moova?",
        a: "Karine Silva — moovacora@gmail.com. Para exercer seus direitos LGPD (acesso, correção, exclusão, portabilidade), entre em contato por esse email.",
      },
    ],
  },
]

function FAQItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E0D8CE] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
      >
        <span className="text-sm font-medium text-[#2A2A2A] leading-snug">{q}</span>
        <ChevronDown className={cn("w-4 h-4 text-[#8A8A8A] shrink-0 mt-0.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="text-sm text-[#5A5A5A] pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function AjudaPage() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Central de Ajuda</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">Perguntas frequentes sobre a Moova e a Nara</p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white border border-[#E0D8CE] rounded-xl p-6">
          <h2 className="font-serif text-lg text-[#2D4A3E] mb-1">{section.title}</h2>
          <div>
            {section.items.map((item) => (
              <FAQItem key={item.q} {...item} />
            ))}
          </div>
        </div>
      ))}

      <div className="bg-[#EAE3D9] rounded-xl p-6 space-y-3">
        <h2 className="font-serif text-lg text-[#2D4A3E]">Ainda com dúvidas?</h2>
        <p className="text-sm text-[#5A5A5A]">Nossa equipe responde em até 24h úteis nos dias de semana e 12h nos fins de semana.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-[#2D4A3E] bg-white border border-[#E0D8CE] rounded-lg px-4 py-2.5 hover:bg-[#F0F5F2] transition-colors"
          >
            <Phone className="w-4 h-4" />
            WhatsApp Suporte
          </a>
          <a
            href="mailto:suporte@moovaimob.com"
            className="flex items-center gap-2 text-sm font-medium text-[#2D4A3E] bg-white border border-[#E0D8CE] rounded-lg px-4 py-2.5 hover:bg-[#F0F5F2] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            suporte@moovaimob.com
          </a>
        </div>
      </div>
    </div>
  )
}
