import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("instance_name, status, qr_code")
    .eq("user_id", user.id)
    .single()

  if (!account?.instance_name) return NextResponse.json({ qr: null, connected: false })
  if (account.status === "connected") return NextResponse.json({ qr: null, connected: true })

  // QR already stored (from webhook or connect route)
  if (account.qr_code) return NextResponse.json({ qr: account.qr_code, connected: false })

  return NextResponse.json({ qr: null, connected: false })
}
