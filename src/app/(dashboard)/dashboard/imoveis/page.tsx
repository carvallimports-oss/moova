import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Plus, BedDouble, Maximize2 } from "lucide-react"

export default async function ImoveisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user!.id)
    .eq("active", true)
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Imóveis</h1>
          <p className="text-sm text-[#8A8A8A] mt-1">{properties?.length ?? 0} imóveis cadastrados</p>
        </div>
        <Button className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2">
          <Plus className="w-4 h-4" />
          Novo imóvel
        </Button>
      </div>

      {!properties?.length ? (
        <div className="text-center py-20 text-[#8A8A8A]">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum imóvel cadastrado</p>
          <p className="text-xs mt-1">A Cora usa a carteira de imóveis para qualificar e sugerir ao lead.</p>
          <Button className="mt-4 bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro imóvel
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <Card key={property.id} className="border-[#E0D8CE] hover:shadow-sm transition-shadow cursor-pointer">
              <div className="h-32 bg-[#EAE3D9] rounded-t-lg flex items-center justify-center">
                <Building2 className="w-10 h-10 text-[#8A8A8A]/40" />
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-[#2A2A2A] leading-tight">{property.title}</p>
                  <Badge className="bg-[#2D4A3E]/10 text-[#2D4A3E] border-0 text-[10px] shrink-0">
                    {property.type ?? "Imóvel"}
                  </Badge>
                </div>
                <p className="text-xs text-[#8A8A8A]">
                  {property.city}{property.state ? `, ${property.state}` : ""}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#5A5A5A]">
                  {property.bedrooms && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" /> {property.bedrooms} quartos
                    </span>
                  )}
                  {property.area_sqm && (
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> {property.area_sqm} m²
                    </span>
                  )}
                </div>
                {property.price && (
                  <p className="text-[#B87333] font-medium text-sm">
                    R$ {Number(property.price).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
