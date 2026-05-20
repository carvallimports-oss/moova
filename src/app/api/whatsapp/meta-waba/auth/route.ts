import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const appId = process.env.META_APP_ID!
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://moovaimob.com"
  const redirectUri = encodeURIComponent(`${base}/api/whatsapp/meta-waba/callback`)

  // business_management needed to traverse BM → WABA hierarchy (works in dev mode for app admins)
  const scope = "business_management,whatsapp_business_management,whatsapp_business_messaging"

  const url = [
    `https://www.facebook.com/v19.0/dialog/oauth`,
    `?client_id=${appId}`,
    `&redirect_uri=${redirectUri}`,
    `&scope=${scope}`,
    `&response_type=code`,
    `&auth_type=rerequest`,
  ].join("")

  return NextResponse.redirect(url)
}
