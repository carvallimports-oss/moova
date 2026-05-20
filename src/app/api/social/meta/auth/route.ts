import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Scopes for Facebook Page posts + Instagram publishing
const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
].join(",")

export async function GET() {
  const appId = process.env.META_APP_ID
  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID não configurado" }, { status: 503 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/meta/callback`

  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth")
  url.searchParams.set("client_id", appId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", META_SCOPES)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("auth_type", "rerequest")

  return NextResponse.redirect(url.toString())
}
