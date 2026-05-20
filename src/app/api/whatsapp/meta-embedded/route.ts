import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { access_token } = await req.json() as { access_token: string }
  if (!access_token) return NextResponse.json({ error: "access_token obrigatório" }, { status: 400 })

  const META_APP_ID = process.env.META_APP_ID!
  const META_APP_SECRET = process.env.META_APP_SECRET!

  // Exchange short-lived for long-lived (60 days)
  const exchangeRes = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(access_token)}`
  )
  const exchangeData = await exchangeRes.json() as { access_token?: string; error?: { message: string } }
  const longLivedToken = exchangeData.access_token ?? access_token

  const phones: Array<{ phone_number_id: string; display_phone: string; name: string; waba_id: string }> = []

  // Try via /me/businesses → whatsapp_business_accounts → phone_numbers
  const bizRes = await fetch(
    `https://graph.facebook.com/v19.0/me/businesses?fields=whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}&access_token=${longLivedToken}`
  )
  if (bizRes.ok) {
    const bizData = await bizRes.json() as {
      data?: Array<{
        whatsapp_business_accounts?: {
          data?: Array<{
            id: string
            phone_numbers?: { data?: Array<{ id: string; display_phone_number: string; verified_name: string }> }
          }>
        }
      }>
    }
    for (const biz of bizData.data ?? []) {
      for (const waba of biz.whatsapp_business_accounts?.data ?? []) {
        for (const phone of waba.phone_numbers?.data ?? []) {
          phones.push({ phone_number_id: phone.id, display_phone: phone.display_phone_number, name: phone.verified_name, waba_id: waba.id })
        }
      }
    }
  }

  // Fallback: /me/whatsapp_business_accounts
  if (phones.length === 0) {
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,phone_numbers{id,display_phone_number,verified_name}&access_token=${longLivedToken}`
    )
    if (wabaRes.ok) {
      const wabaData = await wabaRes.json() as {
        data?: Array<{
          id: string
          phone_numbers?: { data?: Array<{ id: string; display_phone_number: string; verified_name: string }> }
        }>
      }
      for (const waba of wabaData.data ?? []) {
        for (const phone of waba.phone_numbers?.data ?? []) {
          phones.push({ phone_number_id: phone.id, display_phone: phone.display_phone_number, name: phone.verified_name, waba_id: waba.id })
        }
      }
    }
  }

  return NextResponse.json({ token: longLivedToken, phones })
}
