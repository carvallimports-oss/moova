"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E0] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-8 h-1 bg-[#787F56] rounded-full mx-auto" />
        <div className="space-y-2">
          <p className="font-mono text-[#787F56] text-sm">Erro</p>
          <h1 className="font-serif text-2xl text-[#30360E]">Algo deu errado</h1>
          <p className="text-[#7A7A6A] text-sm">
            Ocorreu um erro inesperado. A equipe Moova foi notificada.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="bg-[#30360E] hover:bg-[#4A5218] text-white">
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}
            className="border-[#D4C5A0]">
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
