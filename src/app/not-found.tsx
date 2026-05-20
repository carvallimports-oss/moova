import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E0] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-8 h-1 bg-[#787F56] rounded-full mx-auto" />
        <div className="space-y-2">
          <p className="font-mono text-[#787F56] text-sm">404</p>
          <h1 className="font-serif text-3xl text-[#30360E]">Página não encontrada</h1>
          <p className="text-[#7A7A6A] text-sm">Essa página não existe ou foi movida.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className={cn(buttonVariants(), "bg-[#30360E] hover:bg-[#4A5218] text-white")}>
            Ir para o painel
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "border-[#D4C5A0]")}>
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}
