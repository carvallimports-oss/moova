import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { approved } = await req.json() as { approved: boolean }

  // Atualiza fila de aprovação
  const { data: approval, error } = await supabase
    .from("human_approvals_queue")
    .update({ resolved_at: new Date().toISOString(), approved })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("message_id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (approved && approval?.message_id) {
    // Marca mensagem como aprovada
    await supabase
      .from("messages")
      .update({ approved_at: new Date().toISOString(), approved_by: user.id })
      .eq("id", approval.message_id)

    // Dispara envio da mensagem
    await inngest.send({
      name: "message/approved",
      data: { messageId: approval.message_id, userId: user.id },
    })
  }

  return NextResponse.json({ ok: true, approved })
}
