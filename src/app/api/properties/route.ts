import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createPropertySchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  type: z.string().optional(),
  bedrooms: z.number().int().optional(),
  area_sqm: z.number().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createPropertySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from("properties")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gera rascunhos de post para as principais plataformas em background
  const platforms = ["instagram_feed", "instagram_stories", "facebook_post", "facebook_marketplace"] as const
  const draftRows = platforms.map((platform) => ({
    user_id: user.id,
    property_id: data.id,
    platform,
    caption: `✨ Novo imóvel disponível: ${data.title}${data.city ? ` em ${data.city}` : ""}${data.price ? ` — R$ ${Number(data.price).toLocaleString("pt-BR")}` : ""}. Entre em contato para mais informações! 🏡`,
    status: "pending" as const,
  }))
  await supabase.from("social_posts_drafts").insert(draftRows)

  return NextResponse.json(data, { status: 201 })
}
