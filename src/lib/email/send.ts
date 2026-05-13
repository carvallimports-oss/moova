type SendEmailParams = {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send")
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: params.from ?? "Moova <noreply@moova.com.br>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend email failed (${res.status}): ${body}`)
  }
}
