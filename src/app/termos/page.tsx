import Link from "next/link"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <Link href="/" className="text-[#B87333] text-sm hover:underline">← Voltar</Link>
          <div className="w-8 h-1 bg-[#B87333] rounded-full" />
          <h1 className="font-serif text-3xl text-[#2D4A3E]">Termos de Uso</h1>
          <p className="text-[#8A8A8A] text-sm">Última atualização: maio de 2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-[#3A3A3A] space-y-6">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">1. Aceitação dos Termos</h2>
            <p>Ao criar uma conta no Moova, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o serviço.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">2. O Serviço</h2>
            <p>O Moova é uma plataforma de assistente de IA (Cora) para corretores de imóveis brasileiros. A Cora atende leads via WhatsApp de forma automatizada, dentro dos parâmetros configurados pelo corretor.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">3. Responsabilidades do Usuário</h2>
            <p>O corretor é responsável por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Obter consentimento dos leads antes de iniciar contato via WhatsApp</li>
              <li>Garantir que as informações de imóveis inseridas sejam precisas</li>
              <li>Respeitar as normas do CRECI e do Conselho Federal de Corretores</li>
              <li>Cumprir a Lei Geral de Proteção de Dados (LGPD)</li>
              <li>Não usar o serviço para práticas enganosas ou ilegais</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">4. Pacto Moova 90 — Garantia Reversa</h2>
            <p>O Pacto Moova 90 é uma garantia condicionada ao cumprimento das atividades do programa. Os cenários de devolução (A, B, C, D) são calculados com base nos marcos verificáveis de boas-práticas e resultados. Detalhes completos são fornecidos na contratação.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">5. Limitação de Responsabilidade</h2>
            <p>O Moova não se responsabiliza por resultados de negociações realizadas entre corretor e lead, por informações incorretas inseridas pelo corretor, ou por instabilidades de serviços de terceiros (WhatsApp, OpenAI, Evolution API).</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, marca e tecnologia do Moova são propriedade da empresa. O usuário não pode copiar, modificar ou redistribuir sem autorização expressa.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">7. Cancelamento</h2>
            <p>O usuário pode cancelar a assinatura a qualquer momento pelo painel. O acesso continua até o fim do período pago. Não há devolução proporcional fora dos termos do Pacto Moova 90.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">8. Foro</h2>
            <p>Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes destes Termos.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#2D4A3E]">9. Contato</h2>
            <p>Dúvidas sobre estes Termos: <strong>juridico@moova.com.br</strong></p>
          </section>
        </div>
      </div>
    </div>
  )
}
