"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Plus, BedDouble, Maximize2 } from "lucide-react"
import { ImovelModal } from "@/components/dashboard/imovel-modal"

type DbProperty = {
  id: string
  title: string
  description?: string | null
  price?: number | null
  address?: string | null
  city?: string | null
  state?: string | null
  type?: string | null
  bedrooms?: number | null
  area_sqm?: number | null
  active: boolean
}

type Property = {
  id: string
  title: string
  description?: string
  price?: number
  address?: string
  city?: string
  state?: string
  type?: string
  bedrooms?: number
  area_sqm?: number
  active: boolean
}

function coerce(p: DbProperty): Property {
  return {
    id: p.id,
    title: p.title,
    active: p.active,
    description: p.description ?? undefined,
    price: p.price ?? undefined,
    address: p.address ?? undefined,
    city: p.city ?? undefined,
    state: p.state ?? undefined,
    type: p.type ?? undefined,
    bedrooms: p.bedrooms ?? undefined,
    area_sqm: p.area_sqm ?? undefined,
  }
}

export function ImoveisClient({ initialProperties }: { initialProperties: DbProperty[] }) {
  const [properties, setProperties] = useState(() => initialProperties.map(coerce))
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Property | null>(null)

  function openCreate() {
    setSelected(null)
    setModalOpen(true)
  }

  function openEdit(p: Property) {
    setSelected(p)
    setModalOpen(true)
  }

  function handleSaved(p: Property) {
    const coerced = coerce(p as DbProperty)
    setProperties((prev) => {
      const idx = prev.findIndex((x) => x.id === coerced.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = coerced
        return next
      }
      return [coerced, ...prev]
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Imóveis</h1>
          <p className="text-sm text-[#8A8A8A] mt-1">{properties.length} imóveis cadastrados</p>
        </div>
        <Button onClick={openCreate} className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2">
          <Plus className="w-4 h-4" />
          Novo imóvel
        </Button>
      </div>

      {!properties.length ? (
        <div className="text-center py-20 text-[#8A8A8A]">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum imóvel cadastrado</p>
          <p className="text-xs mt-1">A Cora usa a carteira de imóveis para qualificar e sugerir ao lead.</p>
          <Button onClick={openCreate} className="mt-4 bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white text-sm gap-2">
            <Plus className="w-4 h-4" />
            Adicionar primeiro imóvel
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <Card
              key={property.id}
              onClick={() => openEdit(property)}
              className="border-[#E0D8CE] hover:shadow-sm transition-shadow cursor-pointer"
            >
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

      <ImovelModal
        key={selected?.id ?? "new"}
        property={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
