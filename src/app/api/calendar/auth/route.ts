import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getGoogleAuthUrl } from "@/lib/calendar/google"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/calendar/callback`
  const url = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
