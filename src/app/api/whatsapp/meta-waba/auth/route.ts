import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const appId = process.env.META_APP_ID!
  const base = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = encodeURIComponent(`${base}/api/whatsapp/meta-waba/callback`)

  // business_management requires Meta App Review — use only WhatsApp-specific scopes
  const scope = "whatsapp_business_management,whatsapp_business_messaging"

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
