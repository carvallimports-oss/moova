"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [magicSent, setMagicSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email ou senha incorretos.")
    } else {
      router.push("/dashboard")
    }
    setLoading(false)
  }

  async function handleMagicLink() {
    if (!email) { setError("Digite seu email primeiro."); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError("Erro ao enviar link. Tente novamente.")
    else setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
          <h1 className="font-serif text-3xl text-[#2D4A3E]">Moova</h1>
          <p className="text-[#8A8A8A] text-sm">Acesse sua conta</p>
        </div>

        <Card className="border-[#E0D8CE] shadow-sm">
          <CardHeader className="pb-3" />
          <CardContent className="space-y-4">
            {magicSent ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">📬</div>
                <p className="text-[#2D4A3E] font-medium">Link enviado!</p>
                <p className="text-sm text-[#8A8A8A]">
                  Verifique seu email <strong>{email}</strong> e clique no link para entrar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[#2A2A2A]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#E0D8CE] focus:border-[#2D4A3E]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[#2A2A2A]">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-[#E0D8CE] focus:border-[#2D4A3E]"
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E0D8CE]" />
                  </div>
                  <div className="relative flex justify-center text-xs text-[#8A8A8A]">
                    <span className="bg-white px-2">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleMagicLink}
                  className="w-full border-[#E0D8CE] text-[#2D4A3E]"
                >
                  Entrar com link por email
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[#8A8A8A]">
          Não tem conta?{" "}
          <Link href="/signup" className="text-[#B87333] hover:underline font-medium">
            Solicitar acesso
          </Link>
        </p>
      </div>
    </div>
  )
}
