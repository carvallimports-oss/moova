const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3"

export function getGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
}

async function doRefreshToken(refreshTokenStr: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshTokenStr,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  return { access_token: data.access_token, expiry_date: Date.now() + data.expires_in * 1000 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getValidToken(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry")
    .eq("id", userId)
    .single()

  if (!data?.google_calendar_refresh_token) return null

  const expiry = data.google_calendar_token_expiry
    ? new Date(data.google_calendar_token_expiry).getTime()
    : 0

  if (Date.now() > expiry - 60000) {
    try {
      const { access_token, expiry_date } = await doRefreshToken(data.google_calendar_refresh_token)
      await supabase.from("users").update({
        google_calendar_access_token: access_token,
        google_calendar_token_expiry: new Date(expiry_date).toISOString(),
      }).eq("id", userId)
      return access_token
    } catch {
      return null
    }
  }

  return data.google_calendar_access_token as string
}

// Returns a natural-language summary of upcoming events so Cora can avoid conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFreeSlots(supabase: any, userId: string): Promise<string | null> {
  const accessToken = await getValidToken(supabase, userId)
  if (!accessToken) return null

  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 86400000)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: in7days.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  })

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null

    const data = await res.json() as {
      items: Array<{
        summary?: string
        start: { dateTime?: string; date?: string }
        end: { dateTime?: string; date?: string }
      }>
    }

    const events = (data.items ?? []).filter((e) => e.start.dateTime)
    if (events.length === 0) {
      return "Agenda do corretor: livre nos próximos 7 dias. Pode sugerir qualquer horário comercial."
    }

    const list = events.slice(0, 6).map((e) => {
      const start = new Date(e.start.dateTime!)
      const end = new Date(e.end.dateTime ?? e.start.dateTime!)
      const day = start.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })
      const from = start.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
      const to = end.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
      return `${day} ${from}–${to} (${e.summary ?? "Compromisso"})`
    }).join("; ")

    return `AGENDA DO CORRETOR (próximos 7 dias — compromissos já marcados): ${list}. Ao sugerir visitas, evite esses horários e prefira períodos livres.`
  } catch {
    return null
  }
}
