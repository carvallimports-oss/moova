import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = randomBytes(16).toString("hex")

  const { error } = await supabase
    .from("diagnostico_cora_14d")
    .update({ share_token: token, report_shared: true })
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/relatorio/${token}`
  return NextResponse.json({ url, token })
}
