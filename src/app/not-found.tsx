import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
        <div className="space-y-2">
          <p className="font-mono text-[#B87333] text-sm">404</p>
          <h1 className="font-serif text-3xl text-[#2D4A3E]">Página não encontrada</h1>
          <p className="text-[#8A8A8A] text-sm">Essa página não existe ou foi movida.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className={cn(buttonVariants(), "bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white")}>
            Ir para o painel
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "border-[#E0D8CE]")}>
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}
