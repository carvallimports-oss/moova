import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function fetchPhonesFromToken(token: string) {
  type Phone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }

  // Step 1: collect all WABA IDs from every possible source
  const ids = new Set<string>()

  const [bizRes, wabaRes, meRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=whatsapp_business_accounts{id}&access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id&access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${token}`),
  ])

  if (bizRes.ok) {
    const biz = await bizRes.json() as { data?: Array<{ whatsapp_business_accounts?: { data?: Array<{ id: string }> } }> }
    for (const b of biz.data ?? []) {
      for (const w of b.whatsapp_business_accounts?.data ?? []) { if (w.id) ids.add(w.id) }
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

  // Step 2: fetch phone numbers directly from each WABA
  const seen = new Set<string>()
  const phones: Phone[] = []

  await Promise.all(Array.from(ids).map(async (wabaId) => {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${token}`
    )
    if (!res.ok) return
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

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { access_token, code } = await req.json() as { access_token?: string; code?: string }
  if (!access_token && !code) return NextResponse.json({ error: "access_token ou code obrigatório" }, { status: 400 })

  const META_APP_ID = process.env.META_APP_ID!
  const META_APP_SECRET = process.env.META_APP_SECRET!

  let shortLivedToken = access_token ?? ""

  // Embedded Signup flow: exchange authorization code for short-lived token
  if (code) {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}`
    )
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }
    if (!tokenData.access_token) {
      return NextResponse.json({ error: tokenData.error?.message ?? "Erro ao trocar code por token" }, { status: 400 })
    }
    shortLivedToken = tokenData.access_token
  }

  // Exchange short-lived for long-lived (60 days)
  const exchangeRes = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`
  )
  const exchangeData = await exchangeRes.json() as { access_token?: string; error?: { message: string } }
  const longLivedToken = exchangeData.access_token ?? shortLivedToken

  const phones = await fetchPhonesFromToken(longLivedToken)

  return NextResponse.json({ token: longLivedToken, phones })
}
