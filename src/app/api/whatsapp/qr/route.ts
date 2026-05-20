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

  // Fetch QR directly from Evolution API
  if (evolutionUrl && evolutionKey) {
    try {
      const res = await fetch(`${evolutionUrl}/instance/connect/${account.instance_name}`, {
        headers: { apikey: evolutionKey },
      })
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await res.json() as Record<string, any>
        // Handle multiple Evolution API response formats
        const qr: string | null =
          data?.qrcode?.base64 ??
          data?.base64 ??
          data?.qr?.base64 ??
          (typeof data?.qrcode === "string" ? data.qrcode : null) ??
          null

        console.log("[qr-route] Evolution API response keys:", Object.keys(data), "hasQr:", !!qr)

        if (qr) {
          const adminSupabase = createAdminClient()
          await adminSupabase.from("whatsapp_accounts").update({ qr_code: qr }).eq("user_id", user.id)
          return NextResponse.json({ qr, connected: false })
        }
      } else {
        console.warn("[qr-route] Evolution API returned", res.status)
      }
    } catch (e) {
      console.error("[qr-route] Error fetching QR from Evolution API:", e)
    }
  }

  return NextResponse.json({ qr: null, connected: false })
}
