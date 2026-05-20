"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoraWidgetProps {
  whatsappHref: string
  brokerName: string
}

export function CoraWidget({ whatsappHref, brokerName }: CoraWidgetProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-white border border-[#D4C5A0] rounded-2xl shadow-xl w-72 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Widget header */}
          <div className="bg-[#30360E] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#787F56] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-serif font-bold">C</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Cora</p>
              <p className="text-[10px] text-[#8AC0A8]">Assistente de {brokerName}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Widget body */}
          <div className="p-4 space-y-3">
            <div className="bg-[#F0F7F4] rounded-xl rounded-tl-sm p-3">
              <p className="text-sm text-[#30360E] leading-relaxed">
                Olá! Sou a Cora, assistente de <strong>{brokerName}</strong>. 🏠
              </p>
            </div>
            <div className="bg-[#F0F7F4] rounded-xl rounded-tl-sm p-3">
              <p className="text-sm text-[#30360E] leading-relaxed">
                Posso te ajudar com informações sobre os imóveis, agendar visitas ou tirar dúvidas.
              </p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#30360E] hover:bg-[#20240A] text-white text-sm font-medium rounded-xl py-3 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar pelo WhatsApp
            </a>
            <p className="text-[10px] text-center text-[#7A7A6A]">
              Respostas instantâneas via WhatsApp
            </p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          open
            ? "bg-[#4A4A3A] hover:bg-[#3A3A3A]"
            : "bg-[#30360E] hover:bg-[#20240A] hover:scale-105"
        )}
        aria-label="Falar com a Cora"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
      </button>
    </div>
  )
}
