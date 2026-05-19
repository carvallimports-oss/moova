import { createClient } from "@/lib/supabase/server"
import { PublicacoesClient } from "@/components/dashboard/publicacoes-client"

export const dynamic = "force-dynamic"

export default async function PublicacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  const [draftsResult, profileResult] = await Promise.all([
    supabase
      .from("social_posts_drafts")
      .select("id, platform, caption, media_url, status, approved_at, published_at, published_meta_id, created_at, property_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("users")
      .select("meta_page_name, meta_instagram_id, meta_token_expires_at")
      .eq("id", user!.id)
      .single(),
  ])

  const drafts = draftsResult.data ?? []
  const profile = profileResult.data
  const isMetaConnected = !!(profile?.meta_page_name)
  const pending = drafts.filter((d) => d.status === "pending").length

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Publicações</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">
          Rascunhos gerados pela Nara — revise e aprove antes de publicar.
          {pending > 0 && <span className="ml-2 text-[#B87333] font-medium">{pending} aguardando aprovação</span>}
        </p>
      </div>
      <PublicacoesClient
        initialDrafts={drafts}
        isMetaConnected={isMetaConnected}
        metaPageName={profile?.meta_page_name ?? null}
        metaJustConnected={params.meta === "connected"}
      />
    </div>
  )
}
