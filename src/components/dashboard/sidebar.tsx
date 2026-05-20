"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Upload,
  Calendar,
  CreditCard,
  BarChart3,
  Users,
  ShieldCheck,
  HelpCircle,
  Home,
  TrendingUp,
  ImagePlay,
  Dumbbell,
  Scale,
  Briefcase,
  UserCheck,
  ClipboardList,
  Calculator,
  Target,
  Wand2,
  Database,
  LineChart,
  Key,
  PenLine,
  BadgeCheck,
  Newspaper,
  BookOpen,
} from "lucide-react"

const PLAN_LABELS: Record<string, string> = {
  evolution: "Moova Atende",
  bsp: "Moova Atende BSP",
  opera: "Moova Opera",
  inteligencia: "Moova Inteligência",
  maestria: "Moova Maestria",
}
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/dashboard/conversas", label: "Conversas", icon: MessageSquare },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/proprietarios", label: "Proprietários", icon: Home },
  { href: "/dashboard/locacao", label: "Locação", icon: Key },
  { href: "/dashboard/captacao", label: "Captação", icon: Target },
  { href: "/dashboard/imoveis", label: "Imóveis", icon: Building2 },
  { href: "/dashboard/estudio", label: "Estúdio", icon: Wand2 },
  { href: "/dashboard/publicacoes", label: "Publicações", icon: ImagePlay },
  { href: "/dashboard/visitas", label: "Visitas", icon: Calendar },
  { href: "/dashboard/treina", label: "Cora Treina", icon: Dumbbell },
  { href: "/dashboard/defende", label: "Cora Defende", icon: Scale },
  { href: "/dashboard/assinatura", label: "Assinatura", icon: PenLine },
  { href: "/dashboard/credito", label: "Crédito", icon: BadgeCheck },
  { href: "/dashboard/servicos", label: "Serviços", icon: Briefcase },
  { href: "/dashboard/apresenta", label: "Cora Apresenta", icon: UserCheck },
  { href: "/dashboard/vistoria", label: "Vistoria", icon: ClipboardList },
  { href: "/dashboard/estimativa", label: "Estimativa", icon: Calculator },
  { href: "/dashboard/cma-enterprise", label: "CMA Enterprise", icon: Database },
  { href: "/dashboard/newsletter", label: "Cora me Conta", icon: Newspaper },
  { href: "/dashboard/diario", label: "Diário do Imóvel", icon: BookOpen },
  { href: "/dashboard/metricas", label: "Métricas", icon: LineChart },
  { href: "/dashboard/relatorio", label: "Diagnóstico", icon: BarChart3 },
  { href: "/dashboard/pacto", label: "Pacto 90", icon: ShieldCheck },
  { href: "/dashboard/planos", label: "Planos", icon: TrendingUp },
  { href: "/dashboard/importar", label: "Importar", icon: Upload },
  { href: "/dashboard/cobranca", label: "Cobrança", icon: CreditCard },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { href: "/dashboard/ajuda", label: "Ajuda", icon: HelpCircle },
]

function NavContent({
  userName,
  pendingApprovals,
  diagDay,
  plan,
  onNavigate,
}: {
  userName: string
  pendingApprovals: number
  diagDay: number | null
  plan: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#D4C5A0]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-[#787F56] rounded-full" />
          <span className="font-serif text-xl text-[#30360E]">Moova</span>
        </div>
        <p className="text-[10px] text-[#7A7A6A] mt-0.5 font-mono uppercase tracking-widest ml-4">
          {PLAN_LABELS[plan] ?? "Moova Atende"}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          const isConversas = href === "/dashboard/conversas"
          const isDiag = href === "/dashboard/relatorio"

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[#30360E] text-white font-medium"
                  : "text-[#4A4A3A] hover:bg-[#E2D4B9] hover:text-[#30360E]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isConversas && pendingApprovals > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  active ? "bg-white/20 text-white" : "bg-[#787F56] text-white"
                )}>
                  {pendingApprovals > 99 ? "99+" : pendingApprovals}
                </span>
              )}
              {isDiag && diagDay !== null && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                  active ? "bg-white/20 text-white" : "bg-[#E2D4B9] text-[#4A4A3A]"
                )}>
                  {diagDay}/14
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#D4C5A0]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#30360E] text-white text-xs">
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2A2A2A] truncate">{userName}</p>
            <p className="text-xs text-[#7A7A6A]">Corretor</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-8 h-8 text-[#7A7A6A] hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DashboardSidebar({
  userName,
  pendingApprovals,
  diagDay,
  plan,
}: {
  userName: string
  pendingApprovals: number
  diagDay: number | null
  plan: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#F5F0E0] border-b border-[#D4C5A0] px-4 h-14 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="text-[#30360E]">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-white border-r border-[#D4C5A0]">
            <NavContent
              userName={userName}
              pendingApprovals={pendingApprovals}
              diagDay={diagDay}
              plan={plan}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="font-serif text-lg text-[#30360E]">Moova</span>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-[#D4C5A0] flex-col shrink-0">
        <NavContent userName={userName} pendingApprovals={pendingApprovals} diagDay={diagDay} plan={plan} />
      </aside>
    </>
  )
}
