import Link from "next/link"

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E0] px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <Link href="/" className="text-[#787F56] text-sm hover:underline">← Voltar</Link>
          <div className="w-8 h-1 bg-[#787F56] rounded-full" />
          <h1 className="font-serif text-3xl text-[#30360E]">Política de Privacidade</h1>
          <p className="text-[#7A7A6A] text-sm">Última atualização: maio de 2026 · LGPD compliant</p>
        </div>

        <div className="prose prose-sm max-w-none text-[#3A3A3A] space-y-6">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">1. Controlador dos Dados</h2>
            <p>O Moova atua como controlador dos dados pessoais dos corretores (usuários) e como operador dos dados dos leads, conforme art. 5º da LGPD (Lei 13.709/2018).</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">2. Dados Coletados</h2>
            <p><strong>Do corretor:</strong> nome, e-mail, telefone, CRECI, estado, preferências de tom da Nara.</p>
            <p><strong>Dos leads (tratados pelo corretor):</strong> nome, telefone WhatsApp, histórico de conversas, estimativa de orçamento, região de interesse.</p>
            <p><strong>Dados automáticos:</strong> logs de acesso, eventos do sistema (Inngest), status de conexão WhatsApp.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">3. Finalidade do Tratamento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prestação do serviço de assistente de IA (Nara)</li>
              <li>Processamento de pagamentos via Asaas</li>
              <li>Envio de comunicações transacionais (Resend)</li>
              <li>Diagnóstico e métricas de desempenho do corretor</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">4. Base Legal</h2>
            <p>O tratamento de dados é realizado com base em: (a) execução de contrato, (b) legítimo interesse do corretor para atendimento de leads, (c) consentimento explícito coletado no onboarding.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">5. Compartilhamento com Terceiros</h2>
            <p>Os dados são compartilhados apenas com suboperadores necessários à prestação do serviço:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — banco de dados (EUA, DPA disponível)</li>
              <li><strong>OpenAI / Anthropic</strong> — processamento de linguagem natural</li>
              <li><strong>ElevenLabs</strong> — síntese de voz</li>
              <li><strong>Evolution API</strong> — gateway WhatsApp</li>
              <li><strong>Asaas</strong> — processamento de pagamentos (Brasil)</li>
              <li><strong>Resend</strong> — envio de e-mail transacional</li>
            </ul>
            <p>Nenhum dado é vendido a terceiros.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">6. Retenção de Dados</h2>
            <p>Dados de leads são retidos enquanto a conta do corretor estiver ativa, e por até 5 anos após o cancelamento para fins fiscais e legais. O corretor pode solicitar a exclusão antecipada.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">7. Direitos do Titular</h2>
            <p>Conforme LGPD, você tem direito a: acesso, correção, exclusão, portabilidade, revogação de consentimento e oposição ao tratamento. Solicitações: <strong>moovacora@gmail.com</strong></p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">8. Segurança</h2>
            <p>Utilizamos criptografia em trânsito (HTTPS/TLS), Row Level Security no banco de dados (Supabase RLS), e controle de acesso por sessão autenticada (Supabase Auth).</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-[#30360E]">9. Contato com o DPO</h2>
            <p>Encarregado de Proteção de Dados: <strong>Karine Silva</strong> — <strong>moovacora@gmail.com</strong></p>
          </section>
        </div>
      </div>
    </div>
  )
}
