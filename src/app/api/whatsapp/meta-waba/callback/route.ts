import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error_description")
  const base = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp_error=${encodeURIComponent(error ?? "Acesso negado")}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/login`)

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = encodeURIComponent(`${base}/api/whatsapp/meta-waba/callback`)

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
  )
  const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }
  if (!tokenData.access_token) {
    const msg = encodeURIComponent(tokenData.error?.message ?? "Erro ao obter token")
    return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp_error=${msg}`)
  }

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(tokenData.access_token)}`
  )
  const llData = await llRes.json() as { access_token?: string }
  const longToken = llData.access_token ?? tokenData.access_token

  // Fetch WABAs and phone numbers
  type Phone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }
  const phones: Phone[] = []

  const bizRes = await fetch(
    `https://graph.facebook.com/v19.0/me/businesses?fields=whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}&access_token=${longToken}`
  )
  if (bizRes.ok) {
    const biz = await bizRes.json() as { data?: Array<{ whatsapp_business_accounts?: { data?: Array<{ id: string; phone_numbers?: { data?: Array<{ id: string; display_phone_number: string; verified_name: string }> } }> } }> }
    for (const b of biz.data ?? []) {
      for (const w of b.whatsapp_business_accounts?.data ?? []) {
        for (const p of w.phone_numbers?.data ?? []) {
          phones.push({ phone_number_id: p.id, display_phone: p.display_phone_number, name: p.verified_name, waba_id: w.id })
        }
      }
    }
  }

  // Fallback
  if (phones.length === 0) {
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,phone_numbers{id,display_phone_number,verified_name}&access_token=${longToken}`
    )
    if (wabaRes.ok) {
      const wabaData = await wabaRes.json() as { data?: Array<{ id: string; phone_numbers?: { data?: Array<{ id: string; display_phone_number: string; verified_name: string }> } }> }
      for (const w of wabaData.data ?? []) {
        for (const p of w.phone_numbers?.data ?? []) {
          phones.push({ phone_number_id: p.id, display_phone: p.display_phone_number, name: p.verified_name, waba_id: w.id })
        }
      }
    }
  }

  if (phones.length === 0) {
    return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp_error=${encodeURIComponent("Nenhum número WhatsApp Business encontrado nessa conta.")}`)
  }

  // Use first phone (or only one)
  const phone = phones[0]
  const adminSupabase = createAdminClient()
  await adminSupabase.from("whatsapp_accounts").upsert({
    user_id: user.id,
    provider: "bsp",
    bsp_phone_number_id: phone.phone_number_id,
    bsp_waba_id: phone.waba_id,
    bsp_access_token: longToken,
    phone_number: phone.display_phone,
    status: "connected",
    connected_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp=connected&phone=${encodeURIComponent(phone.display_phone)}`)
}
