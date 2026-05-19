import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Phone, MessageCircle, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from("users")
    .select("broker_name, name, city, state_uf, bio")
    .eq("portal_slug", slug)
    .single()

  if (!user) return { title: "Corretor não encontrado | Moova" }

  const name = user.broker_name ?? user.name
  const location = [user.city, user.state_uf].filter(Boolean).join(" — ")
  return {
    title: `${name} | Corretor Moova${location ? ` | ${location}` : ""}`,
    description: user.bio ?? `Conheça o portfólio de imóveis de ${name} no Moova.`,
  }
}

export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: userData } = await supabase
    .from("users")
    .select("id, broker_name, name, phone, city, state_uf, bio, avatar_url")
    .eq("portal_slug", slug)
    .single()

  if (!userData) notFound()

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, price, address, city, bedrooms, area_sqm, type")
    .eq("user_id", userData.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(12)

  const brokerName = userData.broker_name ?? userData.name
  const location = [userData.city, userData.state_uf].filter(Boolean).join(", ")
  const whatsappHref = userData.phone
    ? `https://wa.me/55${userData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${brokerName}, vi seu portal Moova e gostaria de saber mais sobre os imóveis.`)}`
    : null

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="bg-white border-b border-[#E0D8CE]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#B87333] rounded-full" />
            <span className="font-serif text-xl text-[#2D4A3E]">Moova</span>
          </div>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-white bg-[#2D4A3E] rounded-lg px-4 py-2 hover:bg-[#1e3329] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com corretor
            </a>
          )}
        </div>
      </header>

      {/* Broker hero */}
      <section className="bg-white border-b border-[#E0D8CE]">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-[#2D4A3E] flex items-center justify-center shrink-0">
              {userData.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userData.avatar_url} alt={brokerName} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-serif">{brokerName.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <h1 className="font-serif text-2xl text-[#2D4A3E]">{brokerName}</h1>
              {location && (
                <p className="flex items-center gap-1.5 text-sm text-[#8A8A8A] mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </p>
              )}
              {userData.bio && (
                <p className="text-sm text-[#5A5A5A] mt-3 leading-relaxed max-w-xl">{userData.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-4">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#2D4A3E] border border-[#E0D8CE] bg-white rounded-lg px-3 py-2 hover:bg-[#EAE3D9] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Properties */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-serif text-xl text-[#2D4A3E] mb-6">
          {properties?.length ? `${properties.length} imóv${properties.length === 1 ? "el" : "eis"} em carteira` : "Imóveis em carteira"}
        </h2>

        {!properties?.length ? (
          <div className="text-center py-16 text-[#8A8A8A]">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum imóvel disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p) => (
              <div key={p.id} className="bg-white border border-[#E0D8CE] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-[#EAE3D9] flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-[#B87333] opacity-50" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-[#8A8A8A] uppercase tracking-wide mb-1">{p.type ?? "Imóvel"}</p>
                  <h3 className="text-sm font-medium text-[#2A2A2A] line-clamp-2 mb-2">{p.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#8A8A8A]">
                    {p.bedrooms && <span>{p.bedrooms} quartos</span>}
                    {p.area_sqm && <span>{p.area_sqm}m²</span>}
                  </div>
                  {p.price && (
                    <p className="text-sm font-semibold text-[#2D4A3E] mt-2">
                      R$ {p.price.toLocaleString("pt-BR")}
                    </p>
                  )}
                  {p.city && <p className="text-xs text-[#8A8A8A] mt-1">{p.city}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-[#8A8A8A] border-t border-[#E0D8CE] mt-8">
        <Link href="/" className="hover:text-[#2D4A3E] transition-colors">
          Portal gerado pelo <span className="font-medium text-[#2D4A3E]">Moova</span>
        </Link>
        {" · "}
        <Link href="/privacidade" className="hover:text-[#2D4A3E] transition-colors">Privacidade</Link>
        {" · "}
        <Link href="/termos" className="hover:text-[#2D4A3E] transition-colors">Termos</Link>
      </footer>
    </div>
  )
}
