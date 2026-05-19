import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY

  // Fetch stored instance name
  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("instance_name, status, phone_number")
    .eq("user_id", user.id)
    .single()

  if (!account?.instance_name) {
    return NextResponse.json({ connected: false, status: "not_configured" })
  }

  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ connected: false, status: "api_not_configured", instanceName: account.instance_name })
  }

  const res = await fetch(`${evolutionUrl}/instance/connectionState/${account.instance_name}/`, {
    headers: { "apikey": evolutionKey },
  })

  if (!res.ok) {
    return NextResponse.json({ connected: false, status: "unknown", instanceName: account.instance_name })
  }

  const data = await res.json()
  const state = data.instance?.state ?? data.state ?? "unknown"
  const connected = state === "open"

  // Sync status back to DB if changed
  if ((connected && account.status !== "connected") || (!connected && account.status === "connected")) {
    await supabase
      .from("whatsapp_accounts")
      .update({ status: connected ? "connected" : "disconnected" })
      .eq("user_id", user.id)
  }

  return NextResponse.json({
    connected,
    status: state,
    instanceName: account.instance_name,
    phone: account.phone_number ?? null,
  })
}
