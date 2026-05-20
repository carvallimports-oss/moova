import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AssinaturaClient } from "@/components/dashboard/assinatura-client"

export const dynamic = "force-dynamic"

export default async function AssinaturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: docs } = await supabase
    .from("signature_documents")
    .select("id, title, document_type, status, signatories, file_url, sent_at, completed_at, expires_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const signed = (docs ?? []).filter(d => d.status === "assinado").length
  const pending = (docs ?? []).filter(d => d.status === "aguardando").length

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Assinatura Eletrônica</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Contratos e documentos com validade jurídica — {docs?.length ?? 0} documentos</p>
      </div>

      {(docs?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#EEF0E8] rounded-xl p-4">
            <p className="text-[10px] text-[#7A7A6A] uppercase tracking-widest">Total</p>
            <p className="text-2xl font-bold text-[#30360E] mt-1">{docs?.length ?? 0}</p>
            <p className="text-xs text-[#7A7A6A] mt-0.5">documentos criados</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-[10px] text-green-600 uppercase tracking-widest">Assinados</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{signed}</p>
            <p className="text-xs text-green-600 mt-0.5">concluídos</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-[10px] text-yellow-600 uppercase tracking-widest">Aguardando</p>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{pending}</p>
            <p className="text-xs text-yellow-600 mt-0.5">pendentes de assinatura</p>
          </div>
        </div>
      )}

      {/* D4Sign info banner */}
      <div className="bg-[#30360E] rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-[#787F56]">D4</span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Integração D4Sign</p>
          <p className="text-xs text-[#B0C080] mt-0.5 leading-relaxed">
            Para ativar assinaturas com validade jurídica plena, configure <code className="bg-white/10 px-1 rounded">D4SIGN_TOKEN_API</code> e <code className="bg-white/10 px-1 rounded">D4SIGN_CRYPT_KEY</code> nas variáveis de ambiente.
            Documentos criados agora ficam em modo de rascunho e serão enviados automaticamente quando a integração for ativada.
          </p>
        </div>
      </div>

      <AssinaturaClient initialDocs={docs ?? []} />
    </div>
  )
}
