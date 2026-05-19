import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await supabase
    .from("users")
    .update({
      meta_access_token: null,
      meta_page_id: null,
      meta_page_name: null,
      meta_instagram_id: null,
      meta_token_expires_at: null,
    })
    .eq("id", user.id)

  return NextResponse.json({ ok: true })
}
