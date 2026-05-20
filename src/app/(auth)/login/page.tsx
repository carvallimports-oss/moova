"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"
export default function LoginPage() {
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
      setLoading(false)
    } else {
      window.location.href = "/dashboard"
    }
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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E0] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-1 bg-[#787F56] rounded-full mx-auto" />
          <h1 className="font-serif text-3xl text-[#30360E]">Moova</h1>
          <p className="text-[#7A7A6A] text-sm">Acesse sua conta</p>
        </div>

        <Card className="border-[#D4C5A0] shadow-sm">
          <CardHeader className="pb-3" />
          <CardContent className="space-y-4">
            {magicSent ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">📬</div>
                <p className="text-[#30360E] font-medium">Link enviado!</p>
                <p className="text-sm text-[#7A7A6A]">
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
                    className="border-[#D4C5A0] focus:border-[#30360E]"
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
                    className="border-[#D4C5A0] focus:border-[#30360E]"
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#30360E] hover:bg-[#4A5218] text-white"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#D4C5A0]" />
                  </div>
                  <div className="relative flex justify-center text-xs text-[#7A7A6A]">
                    <span className="bg-white px-2">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleMagicLink}
                  className="w-full border-[#D4C5A0] text-[#30360E]"
                >
                  Entrar com link por email
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[#7A7A6A]">
          Não tem conta?{" "}
          <Link href="/signup" className="text-[#787F56] hover:underline font-medium">
            Solicitar acesso
          </Link>
        </p>
      </div>
    </div>
  )
}
