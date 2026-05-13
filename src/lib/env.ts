import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  ASAAS_API_KEY: z.string().min(1),
  ASAAS_WEBHOOK_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
})

// Valida apenas em runtime (não no build) para permitir desenvolvimento sem todas as chaves
export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ")
    console.warn(`[Moova] Variáveis de ambiente faltando: ${missing}`)
  }
  return result
}

export type Env = z.infer<typeof envSchema>
