import { createClient } from "@/lib/supabase/server"
import { ConfiguracoesForm } from "@/components/dashboard/configuracoes-form"

export const dynamic = "force-dynamic"

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar_connected?: string; calendar_error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  const { data: profile } = await supabase
    .from("users")
    .select("name, creci, phone, whatsapp_provider, cora_formality, cora_custom_prompt, human_approval_active, human_approval_categories, google_calendar_connected, eleven_labs_voice_id, cora_work_start, cora_work_end")
    .eq("id", user!.id)
    .single()

  const { data: waAccount } = await supabase
    .from("whatsapp_accounts")
    .select("status, phone_number, provider")
    .eq("user_id", user!.id)
    .single()

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[#2D4A3E]">Configurações</h1>
        <p className="text-sm text-[#8A8A8A] mt-1">Personalize a Cora e sua conta</p>
      </div>
      <ConfiguracoesForm
        profile={profile}
        waAccount={waAccount}
        calendarConnectedParam={params.calendar_connected === "1"}
        calendarErrorParam={params.calendar_error === "1"}
      />
    </div>
  )
}
