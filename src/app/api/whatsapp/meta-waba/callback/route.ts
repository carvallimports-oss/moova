import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Phone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }

async function collectWabaIds(token: string, appId: string, appSecret: string): Promise<string[]> {
  const ids = new Set<string>()

  // Debug token permissions
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
  )
  const debugData = await debugRes.json() as { data?: { scopes?: string[]; user_id?: string; is_valid?: boolean } }
  console.log(`[bsp] token scopes:`, JSON.stringify(debugData?.data?.scopes))
  const userId = debugData?.data?.user_id

  // Strategy 1: /me/whatsapp_business_accounts (direct WABA access)
  const wabaRes = await fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id&access_token=${token}`)
  const wabaData = await wabaRes.json() as { data?: Array<{ id: string }> }
  console.log(`[bsp] /me/whatsapp_business_accounts:`, wabaRes.status, JSON.stringify(wabaData).slice(0, 400))
  for (const w of wabaData.data ?? []) { if (w.id) ids.add(w.id) }

  // Strategy 2: /me/businesses → WABAs under Business Manager (needs business_management scope)
  const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=whatsapp_business_accounts{id}&access_token=${token}`)
  const bizData = await bizRes.json() as { data?: Array<{ id: string; whatsapp_business_accounts?: { data?: Array<{ id: string }> } }> }
  console.log(`[bsp] /me/businesses:`, bizRes.status, JSON.stringify(bizData).slice(0, 400))
  for (const b of bizData.data ?? []) {
    for (const w of b.whatsapp_business_accounts?.data ?? []) {
      if (w.id) ids.add(w.id)
    }
    // Also try fetching WABA list per business explicitly
    if (b.id && (b.whatsapp_business_accounts?.data ?? []).length === 0) {
      const bmWabaRes = await fetch(`https://graph.facebook.com/v19.0/${b.id}/whatsapp_business_accounts?fields=id&access_token=${token}`)
      const bmWabaData = await bmWabaRes.json() as { data?: Array<{ id: string }> }
      console.log(`[bsp] /${b.id}/whatsapp_business_accounts:`, bmWabaRes.status, JSON.stringify(bmWabaData).slice(0, 400))
      for (const w of bmWabaData.data ?? []) { if (w.id) ids.add(w.id) }
    }
  }

  // Strategy 3: /{userId}/whatsapp_business_accounts
  if (userId) {
    const uidWabaRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/whatsapp_business_accounts?fields=id&access_token=${token}`)
    const uidWabaData = await uidWabaRes.json() as { data?: Array<{ id: string }> }
    console.log(`[bsp] /${userId}/whatsapp_business_accounts:`, uidWabaRes.status, JSON.stringify(uidWabaData).slice(0, 400))
    for (const w of uidWabaData.data ?? []) { if (w.id) ids.add(w.id) }
  }

  console.log(`[bsp] WABAs encontrados: ${ids.size}`, Array.from(ids))
  return Array.from(ids)
}

async function fetchPhonesFromToken(token: string, appId: string, appSecret: string): Promise<Phone[]> {
  const wabaIds = await collectWabaIds(token, appId, appSecret)

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
  console.log(`[bsp] callback params:`, Object.fromEntries(searchParams.entries()))
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
  const phones = await fetchPhonesFromToken(longToken, appId, appSecret)

  if (phones.length === 0) {
    // Token is valid but WABAs couldn't be discovered — save token and let user complete manually
    const adminSupabase = createAdminClient()
    const { error: upsertErr } = await adminSupabase.from("whatsapp_accounts").upsert({
      user_id: user.id,
      provider: "bsp",
      bsp_access_token: longToken,
      status: "disconnected",
    }, { onConflict: "user_id" })
    if (upsertErr) console.error(`[bsp] upsert error:`, upsertErr.message)
    else console.log(`[bsp] token saved for user ${user.id}`)
    return NextResponse.redirect(`${base}/dashboard/configuracoes?bsp_manual=1`)
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
