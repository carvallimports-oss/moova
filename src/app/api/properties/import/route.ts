import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type PropertyRow = {
  title: string
  type?: string
  price?: number
  address?: string
  city?: string
  state?: string
  bedrooms?: number
  area_sqm?: number
  description?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await req.json() as PropertyRow[]
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nenhum imóvel enviado" }, { status: 400 })
  }

  const inserts = rows
    .filter((r) => r.title?.trim())
    .map((r) => ({ ...r, user_id: user.id, active: true }))

  if (!inserts.length) {
    return NextResponse.json({ error: "Nenhum imóvel válido" }, { status: 400 })
  }

  const { data, error } = await supabase.from("properties").insert(inserts).select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: data?.length ?? 0 }, { status: 201 })
}
