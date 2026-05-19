import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase.from("users").select("cma_api_key").eq("id", user.id).single()
  return NextResponse.json({ key: data?.cma_api_key ?? null })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const key = `mve_${randomUUID().replace(/-/g, "")}`
  await supabase.from("users").update({ cma_api_key: key }).eq("id", user.id)
  return NextResponse.json({ key })
}
