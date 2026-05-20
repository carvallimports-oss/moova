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

  // Fetch QR directly from Evolution API — try both GET and POST (varies by version)
  if (evolutionUrl && evolutionKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractQr = (data: Record<string, any>): string | null =>
      data?.qrcode?.base64 ??
      data?.base64 ??
      data?.qr?.base64 ??
      (typeof data?.qrcode === "string" ? data.qrcode : null) ??
      null

    try {
      // Try GET first (Evolution API v1 style)
      const getRes = await fetch(`${evolutionUrl}/instance/connect/${account.instance_name}`, {
        headers: { apikey: evolutionKey },
      })
      if (getRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await getRes.json() as Record<string, any>
        const qr = extractQr(data)
        console.log("[qr-route] GET keys:", Object.keys(data), "hasQr:", !!qr)
        if (qr) {
          const adminSupabase = createAdminClient()
          await adminSupabase.from("whatsapp_accounts").update({ qr_code: qr }).eq("user_id", user.id)
          return NextResponse.json({ qr, connected: false })
        }
      }

      // Fallback: POST (Evolution API v2 style — returns QR in response body)
      const postRes = await fetch(`${evolutionUrl}/instance/connect/${account.instance_name}`, {
        method: "POST",
        headers: { apikey: evolutionKey },
      })
      if (postRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await postRes.json() as Record<string, any>
        const qr = extractQr(data)
        console.log("[qr-route] POST keys:", Object.keys(data), "hasQr:", !!qr)
        if (qr) {
          const adminSupabase = createAdminClient()
          await adminSupabase.from("whatsapp_accounts").update({ qr_code: qr }).eq("user_id", user.id)
          return NextResponse.json({ qr, connected: false })
        }
      } else {
        console.warn("[qr-route] POST connect returned", postRes.status)
      }
    } catch (e) {
      console.error("[qr-route] Error fetching QR from Evolution API:", e)
    }
  }

  return NextResponse.json({ qr: null, connected: false })
}
