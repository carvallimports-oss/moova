"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
        <div className="space-y-2">
          <p className="font-mono text-[#B87333] text-sm">Erro</p>
          <h1 className="font-serif text-2xl text-[#2D4A3E]">Algo deu errado</h1>
          <p className="text-[#8A8A8A] text-sm">
            Ocorreu um erro inesperado. A equipe Moova foi notificada.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}
            className="border-[#E0D8CE]">
            Ir para o painel
          </Button>
        </div>
        {error.digest && (
          <p className="text-[10px] text-[#B0A898] font-mono">ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
