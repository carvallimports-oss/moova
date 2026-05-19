import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const META_SCOPES = "pages_show_list"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  url.searchParams.set("state", user.id)

  return NextResponse.redirect(url.toString())
}
