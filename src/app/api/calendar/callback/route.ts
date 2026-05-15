import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { exchangeCodeForTokens } from "@/lib/calendar/google"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/configuracoes?calendar_error=1`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const redirectUri = `${origin}/api/calendar/callback`
    const { access_token, refresh_token, expiry_date } = await exchangeCodeForTokens(code, redirectUri)

    await supabase.from("users").update({
      google_calendar_connected: true,
      google_calendar_access_token: access_token,
      google_calendar_refresh_token: refresh_token,
      google_calendar_token_expiry: new Date(expiry_date).toISOString(),
    }).eq("id", user.id)

    return NextResponse.redirect(`${origin}/dashboard/configuracoes?calendar_connected=1`)
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/configuracoes?calendar_error=1`)
  }
}
