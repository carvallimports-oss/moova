import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function esc(s: string | null | undefined): string {
  if (!s) return ""
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: userData } = await supabase
    .from("users")
    .select("broker_name, name, email, phone, creci, city, state_uf, portal_slug")
    .eq("id", user.id)
    .single()

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, description, price, address, city, state, type, bedrooms, area_sqm, active, created_at")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false })

  const brokerName = esc(userData?.broker_name ?? userData?.name ?? "")
  const brokerPhone = esc(userData?.phone ?? "")
  const brokerEmail = esc(userData?.email ?? "")
  const brokerCreci = esc(userData?.creci ?? "")
  const portalSlug = userData?.portal_slug ?? ""
  const portalUrl = portalSlug ? `https://moovaimob.com/p/${portalSlug}` : "https://moovaimob.com"

  const now = new Date().toISOString()

  const listings = (properties ?? []).map((p) => {
    const transactionType = p.type?.toLowerCase().includes("alug") ? "Locacao" : "Venda"
    const propType = p.type ?? "Residencial"
    return `
    <Imovel>
      <CodigoImovel>${esc(p.id)}</CodigoImovel>
      <TipoImovel>${esc(propType)}</TipoImovel>
      <TipoTransacao>${transactionType}</TipoTransacao>
      <SubTipoImovel>${esc(propType)}</SubTipoImovel>
      <AreaUtil>${p.area_sqm ?? 0}</AreaUtil>
      <AreaTotal>${p.area_sqm ?? 0}</AreaTotal>
      <Quartos>${p.bedrooms ?? 0}</Quartos>
      <Banheiros>0</Banheiros>
      <Garagens>0</Garagens>
      <PrecoVenda>${p.price ?? 0}</PrecoVenda>
      <Titulo>${esc(p.title)}</Titulo>
      <Descricao>${esc(p.description)}</Descricao>
      <Endereco>${esc(p.address)}</Endereco>
      <Cidade>${esc(p.city ?? userData?.city)}</Cidade>
      <UF>${esc(p.state ?? userData?.state_uf)}</UF>
      <Pais>Brasil</Pais>
      <LinkImovel>${esc(portalUrl)}</LinkImovel>
      <AnuncioPago>Nao</AnuncioPago>
      <Corretor>
        <Nome>${brokerName}</Nome>
        <Email>${brokerEmail}</Email>
        <Telefone>${brokerPhone}</Telefone>
        <CodigoCorretor>${brokerCreci}</CodigoCorretor>
      </Corretor>
    </Imovel>`
  }).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Imoveis xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <GeradoEm>${now}</GeradoEm>
  <TotalImoveis>${(properties ?? []).length}</TotalImoveis>
${listings}
</Imoveis>`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
