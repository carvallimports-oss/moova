import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Find the most recent diagnostico for this user
  const { data: diag } = await supabase
    .from("diagnostico_nara_14d")
    .select("id, share_token")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!diag) return NextResponse.json({ error: "No diagnostico found" }, { status: 404 })

  // Reuse existing token if already shared
  const token = diag.share_token ?? randomBytes(16).toString("hex")

  const { error } = await supabase
    .from("diagnostico_nara_14d")
    .update({ share_token: token, report_shared: true })
    .eq("id", diag.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/relatorio/${token}`
  return NextResponse.json({ url, token })
}
