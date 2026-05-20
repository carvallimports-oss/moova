import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

  // Fallback: fetch QR directly from Evolution API (in case webhook is delayed/rejected)
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  if (evolutionUrl && evolutionKey) {
    try {
      const res = await fetch(`${evolutionUrl}/instance/connect/${account.instance_name}`, {
        headers: { apikey: evolutionKey },
      })
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>
        const base64 =
          (data as { base64?: string }).base64 ??
          (data as { qrcode?: { base64?: string } }).qrcode?.base64 ??
          (typeof (data as { qrcode?: unknown }).qrcode === "string" ? (data as { qrcode: string }).qrcode : null) ??
          null
        if (base64) {
          const adminSupabase = createAdminClient()
          await adminSupabase
            .from("whatsapp_accounts")
            .update({ qr_code: base64, status: "qr_pending" })
            .eq("user_id", user.id)
          return NextResponse.json({ qr: base64, connected: false })
        }
        // If state is "open" the instance connected without scanning (unlikely but handle it)
        const state = (data as { state?: string }).state
        if (state === "open") {
          const adminSupabase = createAdminClient()
          await adminSupabase
            .from("whatsapp_accounts")
            .update({ status: "connected", qr_code: null })
            .eq("user_id", user.id)
          return NextResponse.json({ qr: null, connected: true })
        }
      }
    } catch { /* Evolution API unreachable — return null below */ }
  }

  return NextResponse.json({ qr: null, connected: false })
}
