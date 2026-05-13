"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Senha precisa ter pelo menos 8 caracteres."); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding` },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-1 bg-[#B87333] rounded-full mx-auto" />
          <h1 className="font-serif text-3xl text-[#2D4A3E]">Moova</h1>
          <p className="text-[#8A8A8A] text-sm">Solicitar acesso ao beta</p>
        </div>

        <Card className="border-[#E0D8CE] shadow-sm">
          <CardContent className="p-6 space-y-4">
            {sent ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">✅</div>
                <p className="text-[#2D4A3E] font-medium font-serif">Conta criada!</p>
                <p className="text-sm text-[#8A8A8A]">
                  Enviamos um link de confirmação para <strong>{email}</strong>.
                  Clique nele para acessar o onboarding.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email profissional</Label>
                  <Input id="email" type="email" placeholder="corretor@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="border-[#E0D8CE]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
                  <Input id="password" type="password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="border-[#E0D8CE]" />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <p className="text-xs text-[#8A8A8A]">
                  Ao criar conta você concorda com os{" "}
                  <a href="/termos" className="text-[#B87333] underline">Termos de Uso</a>{" "}
                  e{" "}
                  <a href="/privacidade" className="text-[#B87333] underline">Política de Privacidade</a>.
                </p>
                <Button type="submit" disabled={loading}
                  className="w-full bg-[#2D4A3E] hover:bg-[#3A6B5A] text-white">
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[#8A8A8A]">
          Já tem conta?{" "}
          <Link href="/login" className="text-[#B87333] hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
