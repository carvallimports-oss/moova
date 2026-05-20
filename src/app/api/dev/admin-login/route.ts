import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "carvallimports@gmail.com",
    options: { redirectTo: "https://moovaimob.com/auth/callback" },
  })
  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Erro ao gerar link" }, { status: 500 })
  }
  return NextResponse.redirect(data.properties.action_link)
}
