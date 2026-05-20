"use client"

import { useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Plus, BedDouble, Maximize2, Upload, Loader2 } from "lucide-react"
import { ImovelModal } from "@/components/dashboard/imovel-modal"
import { toast } from "sonner"

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

// Header aliases (PT → EN) for CSV parsing
const CSV_ALIASES: Record<string, string> = {
  titulo: "title", "título": "title", name: "title", nome: "title",
  tipo: "type",
  preco: "price", "preço": "price", valor: "price",
  endereco: "address", "endereço": "address",
  cidade: "city",
  estado: "state", uf: "state",
  quartos: "bedrooms", dormitorios: "bedrooms", "dormitórios": "bedrooms",
  area: "area_sqm", "área": "area_sqm", "area_m2": "area_sqm", "area_sqm": "area_sqm",
  descricao: "description", "descrição": "description",
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const sep = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/[^a-záéíóúâêôãõç_0-9]/g, ""))
  return lines.slice(1).map((line) => {
    const cols = line.split(sep)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      const key = CSV_ALIASES[h] ?? h
      row[key] = (cols[i] ?? "").trim().replace(/^["']|["']$/g, "")
    })
    return row
  }).filter((r) => r.title)
}

export function ImoveisClient({ initialProperties }: { initialProperties: DbProperty[] }) {
  const [properties, setProperties] = useState(() => initialProperties.map(coerce))
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Property | null>(null)
  const [importing, setImporting] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

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

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (!rows.length) { toast.error("Nenhum imóvel encontrado no arquivo"); return }

      const payload = rows.map((r) => ({
        title: r.title,
        type: r.type || undefined,
        price: r.price ? Number(r.price.replace(/[^\d.,]/g, "").replace(",", ".")) || undefined : undefined,
        address: r.address || undefined,
        city: r.city || undefined,
        state: r.state || undefined,
        bedrooms: r.bedrooms ? parseInt(r.bedrooms) || undefined : undefined,
        area_sqm: r.area_sqm ? parseFloat(r.area_sqm.replace(",", ".")) || undefined : undefined,
        description: r.description || undefined,
      }))

      const res = await fetch("/api/properties/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()
      const data = await res.json() as { imported: number }
      toast.success(`${data.imported} imóveis importados`)

      const refreshed = await fetch("/api/properties")
      if (refreshed.ok) {
        const all = await refreshed.json() as DbProperty[]
        setProperties(all.map(coerce))
      }
    } catch {
      toast.error("Erro ao importar CSV. Verifique o formato.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#30360E]">Imóveis</h1>
          <p className="text-sm text-[#7A7A6A] mt-1">{properties.length} imóveis cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => csvRef.current?.click()}
            disabled={importing}
            className="border-[#D4C5A0] text-[#4A4A3A] hover:text-[#30360E] text-sm gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar CSV
          </Button>
          <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVImport} />
          <Button onClick={openCreate} className="bg-[#30360E] hover:bg-[#4A5218] text-white text-sm gap-2">
            <Plus className="w-4 h-4" />
            Novo imóvel
          </Button>
        </div>
      </div>

      {!properties.length ? (
        <div className="text-center py-20 text-[#7A7A6A]">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum imóvel cadastrado</p>
          <p className="text-xs mt-1">A Nara usa a carteira de imóveis para qualificar e sugerir ao lead.</p>
          <Button onClick={openCreate} className="mt-4 bg-[#30360E] hover:bg-[#4A5218] text-white text-sm gap-2">
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
              className="border-[#D4C5A0] hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="h-32 bg-[#E2D4B9] rounded-t-lg flex items-center justify-center">
                <Building2 className="w-10 h-10 text-[#7A7A6A]/40" />
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-[#2A2A2A] leading-tight">{property.title}</p>
                  <Badge className="bg-[#30360E]/10 text-[#30360E] border-0 text-[10px] shrink-0">
                    {property.type ?? "Imóvel"}
                  </Badge>
                </div>
                <p className="text-xs text-[#7A7A6A]">
                  {property.city}{property.state ? `, ${property.state}` : ""}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#4A4A3A]">
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
                  <p className="text-[#787F56] font-medium text-sm">
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
