import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?meta_error=denied`
    )
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/meta/callback`

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?meta_error=config`
    )
  }

  try {
    // 1. Exchange code for short-lived user token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token")
    tokenUrl.searchParams.set("client_id", appId)
    tokenUrl.searchParams.set("client_secret", appSecret)
    tokenUrl.searchParams.set("redirect_uri", redirectUri)
    tokenUrl.searchParams.set("code", code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error("Token exchange failed: " + JSON.stringify(tokenData))

    // 2. Exchange for long-lived user token (~60 days)
    const longUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token")
    longUrl.searchParams.set("grant_type", "fb_exchange_token")
    longUrl.searchParams.set("client_id", appId)
    longUrl.searchParams.set("client_secret", appSecret)
    longUrl.searchParams.set("fb_exchange_token", tokenData.access_token)

    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json()
    const userToken = longData.access_token ?? tokenData.access_token
    const expiresIn = longData.expires_in ?? 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 3. Get Facebook pages (includes page-level access tokens)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    )
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]

    const pageId: string | null = page?.id ?? null
    const pageName: string | null = page?.name ?? null
    const pageToken: string | null = page?.access_token ?? null
    let instagramId: string | null = null

    // 4. Get Instagram Business Account linked to the first page
    if (pageId && pageToken) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
      )
      const igData = await igRes.json()
      instagramId = igData.instagram_business_account?.id ?? null
    }

    // 5. Save to users table (store page token — used for publishing)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    await supabase
      .from("users")
      .update({
        meta_access_token: pageToken ?? userToken,
        meta_page_id: pageId,
        meta_page_name: pageName,
        meta_instagram_id: instagramId,
        meta_token_expires_at: expiresAt,
      })
      .eq("id", user.id)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?meta=connected`
    )
  } catch (err) {
    console.error("Meta callback error:", err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?meta_error=failed`
    )
  }
}
