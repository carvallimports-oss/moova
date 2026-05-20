import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: doc } = await supabase
    .from("signature_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  if (doc.status !== "rascunho") return NextResponse.json({ error: "Documento já enviado" }, { status: 400 })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const signatories = (doc.signatories as Array<{ name: string; email: string; sign_as: string }>) ?? []
  const updatedSignatories = signatories.map((s, i) => ({
    ...s,
    status: "pendente",
    sign_link: `https://app.d4sign.com.br/sign/${id}-${i}`,
  }))

  const { data, error } = await supabase
    .from("signature_documents")
    .update({
      status: "aguardando",
      sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      signatories: updatedSignatories,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, document: data })
}
