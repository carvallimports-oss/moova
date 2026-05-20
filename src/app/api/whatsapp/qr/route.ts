import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("instance_name, status, qr_code")
    .eq("user_id", user.id)
    .single()

  if (!account?.instance_name) return NextResponse.json({ qr: null, connected: false })

  // Check if already connected
  if (account.status === "connected") return NextResponse.json({ qr: null, connected: true })

  // Check QR from webhook (stored in DB)
  if (account.qr_code) return NextResponse.json({ qr: account.qr_code, connected: false })

  // Fetch from Evolution API directly
  if (evolutionUrl && evolutionKey) {
    try {
      const res = await fetch(`${evolutionUrl}/instance/connect/${account.instance_name}/`, {
        headers: { apikey: evolutionKey },
      })
      if (res.ok) {
        const data = await res.json()
        const qr = data.base64 ?? data.qrcode?.base64 ?? null
        if (qr) {
          // Cache in DB for next poll
          const adminSupabase = createAdminClient()
          await adminSupabase.from("whatsapp_accounts").update({ qr_code: qr }).eq("user_id", user.id)
          return NextResponse.json({ qr, connected: false })
        }
      }
    } catch {}
  }

  return NextResponse.json({ qr: null, connected: false })
}
