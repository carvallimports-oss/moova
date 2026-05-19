import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const INSTAGRAM_PLATFORMS = ["instagram_feed", "instagram_stories", "instagram_reels"]
const FACEBOOK_PLATFORMS = ["facebook_post", "facebook_marketplace"]

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Load draft
  const { data: draft, error: draftErr } = await supabase
    .from("social_posts_drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (draftErr || !draft) {
    return NextResponse.json({ error: "Draft não encontrado" }, { status: 404 })
  }

  if (draft.status !== "approved") {
    return NextResponse.json({ error: "Apenas drafts aprovados podem ser publicados" }, { status: 400 })
  }

  // Load Meta credentials from user profile
  const { data: profile } = await supabase
    .from("users")
    .select("meta_access_token, meta_page_id, meta_instagram_id, meta_page_name")
    .eq("id", user.id)
    .single()

  if (!profile?.meta_access_token) {
    return NextResponse.json({ error: "Conta Meta não conectada. Conecte em Configurações." }, { status: 403 })
  }

  const { meta_access_token: token, meta_page_id: pageId, meta_instagram_id: igId } = profile
  const caption = draft.caption ?? ""
  const mediaUrl = draft.media_url ?? null

  let publishedMetaId: string | null = null
  let publishError: string | null = null

  try {
    if (INSTAGRAM_PLATFORMS.includes(draft.platform)) {
      if (!igId) {
        return NextResponse.json({
          error: "Conta Instagram Business não encontrada. Certifique-se de que sua página do Facebook está conectada a uma conta Instagram Business.",
        }, { status: 400 })
      }

      if (!mediaUrl) {
        return NextResponse.json({
          error: "Este post não possui mídia. Posts no Instagram exigem uma imagem ou vídeo.",
        }, { status: 400 })
      }

      // Step 1 — create media container (Instagram Login uses graph.instagram.com)
      const containerBody: Record<string, string> = {
        caption,
        access_token: token,
      }

      if (draft.platform === "instagram_reels") {
        containerBody.media_type = "REELS"
        containerBody.video_url = mediaUrl
      } else {
        containerBody.image_url = mediaUrl
      }

      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerBody),
        }
      )
      const containerData = await containerRes.json()
      if (!containerData.id) {
        throw new Error(containerData.error?.message ?? "Falha ao criar container de mídia")
      }

      // Step 2 — publish
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: token,
          }),
        }
      )
      const publishData = await publishRes.json()
      if (!publishData.id) {
        throw new Error(publishData.error?.message ?? "Falha ao publicar no Instagram")
      }
      publishedMetaId = publishData.id

    } else if (FACEBOOK_PLATFORMS.includes(draft.platform)) {
      if (!pageId) {
        return NextResponse.json({ error: "Página do Facebook não conectada." }, { status: 400 })
      }

      const fbBody: Record<string, string> = {
        message: caption,
        access_token: token,
      }
      if (mediaUrl) fbBody.link = mediaUrl

      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fbBody),
        }
      )
      const fbData = await fbRes.json()
      if (!fbData.id) {
        throw new Error(fbData.error?.message ?? "Falha ao publicar no Facebook")
      }
      publishedMetaId = fbData.id

    } else {
      return NextResponse.json({
        error: `Plataforma "${draft.platform}" não suporta publicação automática ainda.`,
      }, { status: 400 })
    }

    // Update draft as published
    const { data: updated } = await supabase
      .from("social_posts_drafts")
      .update({
        status: "published",
        published_meta_id: publishedMetaId,
        published_at: new Date().toISOString(),
        publish_error: null,
      })
      .eq("id", id)
      .select()
      .single()

    return NextResponse.json({ ok: true, published_meta_id: publishedMetaId, draft: updated })

  } catch (err) {
    publishError = err instanceof Error ? err.message : "Erro desconhecido"

    // Save error to draft for debugging
    await supabase
      .from("social_posts_drafts")
      .update({ publish_error: publishError })
      .eq("id", id)

    return NextResponse.json({ error: publishError }, { status: 502 })
  }
}
