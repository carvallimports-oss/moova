import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Phone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }

async function collectWabaIds(token: string): Promise<string[]> {
  const ids = new Set<string>()

  const [bizRes, wabaRes, meRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=whatsapp_business_accounts{id}&access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id&access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${token}`),
  ])

  if (bizRes.ok) {
    const biz = await bizRes.json() as { data?: Array<{ whatsapp_business_accounts?: { data?: Array<{ id: string }> } }> }
    for (const b of biz.data ?? []) {
      for (const w of b.whatsapp_business_accounts?.data ?? []) {
        if (w.id) ids.add(w.id)
      }
    }
  }

  if (wabaRes.ok) {
    const waba = await wabaRes.json() as { data?: Array<{ id: string }> }
    for (const w of waba.data ?? []) { if (w.id) ids.add(w.id) }
  }

  if (meRes.ok) {
    const me = await meRes.json() as { id?: string }
    if (me.id) {
      const userWabaRes = await fetch(
        `https://graph.facebook.com/v19.0/${me.id}/whatsapp_business_accounts?fields=id&access_token=${token}`
      )
      if (userWabaRes.ok) {
        const data = await userWabaRes.json() as { data?: Array<{ id: string }> }
        for (const w of data.data ?? []) { if (w.id) ids.add(w.id) }
      }
    }
  }

  return Array.from(ids)
}

async function fetchPhonesFromToken(token: string): Promise<Phone[]> {
  const wabaIds = await collectWabaIds(token)
  console.log(`[bsp] WABAs encontrados: ${wabaIds.length}`, wabaIds)

  const seen = new Set<string>()
  const phones: Phone[] = []

  // Fetch phone numbers directly from each WABA — more reliable than nested field expansion
  await Promise.all(wabaIds.map(async (wabaId) => {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
    )
    if (!res.ok) {
      console.warn(`[bsp] phone_numbers falhou para WABA ${wabaId}:`, res.status)
      return
    }
    const data = await res.json() as { data?: Array<{ id: string; display_phone_number: string; verified_name: string }> }
    for (const p of data.data ?? []) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        phones.push({ phone_number_id: p.id, display_phone: p.display_phone_number, name: p.verified_name, waba_id: wabaId })
      }
    }
  }))

  return phones
}

// Subscribe Moova app to receive webhooks from this WABA
async function subscribeWABA(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message: string } }
    console.warn(`[bsp] subscribed_apps falhou para WABA ${wabaId}:`, err?.error?.message ?? res.status)
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error_description")
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://moovaimob.com"

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
    const msg = encodeURIComponent(tokenData.error?.message ?? "Erro ao obter token de acesso")
    return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp_error=${msg}`)
  }

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(tokenData.access_token)}`
  )
  const llData = await llRes.json() as { access_token?: string }
  const longToken = llData.access_token ?? tokenData.access_token

  // Fetch all phone numbers via multiple strategies
  const phones = await fetchPhonesFromToken(longToken)

  if (phones.length === 0) {
    return NextResponse.redirect(
      `${base}/dashboard/configuracoes?bsp_error=${encodeURIComponent("Nenhum número WhatsApp Business encontrado. Certifique-se de que sua conta Facebook tem um WhatsApp Business Account ativo.")}`
    )
  }

  // If multiple phones, encode them as query param and show picker
  if (phones.length > 1) {
    const encoded = encodeURIComponent(JSON.stringify(phones))
    const tokenEncoded = encodeURIComponent(longToken)
    return NextResponse.redirect(
      `${base}/dashboard/configuracoes?bsp=picker&phones=${encoded}&bsp_token=${tokenEncoded}`
    )
  }

  // Single phone — auto-connect
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

  // Subscribe app to WABA webhooks (critical — without this, messages don't arrive)
  await subscribeWABA(phone.waba_id, longToken)

  return NextResponse.redirect(
    `${base}/dashboard/configuracoes?bsp=connected&phone=${encodeURIComponent(phone.display_phone)}`
  )
}
