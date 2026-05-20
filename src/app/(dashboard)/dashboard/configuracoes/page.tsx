import { createClient } from "@/lib/supabase/server"
import { ConfiguracoesForm } from "@/components/dashboard/configuracoes-form"

export const dynamic = "force-dynamic"

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar_connected?: string; calendar_error?: string; meta?: string; meta_error?: string; bsp?: string; bsp_error?: string; phone?: string; phones?: string; bsp_token?: string; bsp_manual?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  type BspPhone = { phone_number_id: string; display_phone: string; name: string; waba_id: string }
  let bspPickerPhones: BspPhone[] | null = null
  if (params.bsp === "picker" && params.phones) {
    try { bspPickerPhones = JSON.parse(decodeURIComponent(params.phones)) as BspPhone[] } catch { /* ignore */ }
  }

  const [profileResult, waResult] = await Promise.all([
    supabase
      .from("users")
      .select("name, creci, phone, whatsapp_provider, nara_formality, nara_custom_prompt, human_approval_active, human_approval_categories, google_calendar_connected, eleven_labs_voice_id, nara_work_start, nara_work_end, portal_slug, bio, city, state_uf, meta_page_name")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("whatsapp_accounts")
      .select("status, phone_number, provider, bsp_phone_number_id, bsp_waba_id")
      .eq("user_id", user!.id)
      .single(),
  ])

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[#30360E]">Configurações</h1>
        <p className="text-sm text-[#7A7A6A] mt-1">Personalize a Nara e sua conta</p>
      </div>
      <ConfiguracoesForm
        profile={profileResult.data}
        waAccount={waResult.data}
        calendarConnectedParam={params.calendar_connected === "1"}
        calendarErrorParam={params.calendar_error === "1"}
        metaConnectedParam={params.meta === "connected"}
        metaErrorParam={params.meta_error ?? null}
        bspConnectedParam={params.bsp === "connected"}
        bspErrorParam={params.bsp_error ?? null}
        bspPhoneParam={params.phone ?? null}
        bspPickerParam={params.bsp === "picker" && !!bspPickerPhones}
        bspPickerPhones={bspPickerPhones ?? undefined}
        bspPickerToken={params.bsp_token ? decodeURIComponent(params.bsp_token) : null}
        bspManualParam={params.bsp_manual === "1"}
        initialMetaPageName={(profileResult.data as { meta_page_name?: string | null } | null)?.meta_page_name ?? null}
      />
    </div>
  )
}
