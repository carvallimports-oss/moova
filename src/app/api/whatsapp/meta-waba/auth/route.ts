import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const appId = process.env.META_APP_ID!
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/meta-waba/callback`)
  const scope = "whatsapp_business_management,whatsapp_business_messaging,business_management"
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
  return NextResponse.redirect(url)
}
