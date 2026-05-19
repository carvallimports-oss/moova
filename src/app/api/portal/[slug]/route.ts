import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: userData } = await supabase
    .from("users")
    .select("id, broker_name, name, phone, city, state_uf, bio, avatar_url")
    .eq("portal_slug", slug)
    .single()

  if (!userData) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, price, address, city, bedrooms, area_sqm, type, description")
    .eq("user_id", userData.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20)

  return NextResponse.json({
    broker: {
      name: userData.broker_name ?? userData.name,
      phone: userData.phone,
      city: userData.city,
      state_uf: userData.state_uf,
      bio: userData.bio,
      avatar_url: userData.avatar_url,
    },
    properties: properties ?? [],
  })
}
