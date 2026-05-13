import { createClient } from "@supabase/supabase-js"

// Cliente com service role — NUNCA usar no frontend
// Bypassa RLS — usar apenas em funções server-side e Inngest
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
