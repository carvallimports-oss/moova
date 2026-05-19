import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { circuloMoovaWelcomeEmail } from "@/lib/email/templates"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function verifyToken(req: Request): Promise<boolean> {
  const token = req.headers.get("asaas-access-token")
  return token === process.env.ASAAS_WEBHOOK_TOKEN
}

type AsaasEvent = {
  event: string
  payment: {
    id: string
    customer: string
    subscription?: string
    status: string
    value: number
    dueDate: string
    externalReference?: string // userId
  }
}

export async function POST(req: Request) {
  if (!(await verifyToken(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json() as AsaasEvent
  const { event, payment } = body
  const supabase = createAdminClient()
  const userId = payment.externalReference

  if (!userId) {
    console.warn("[asaas-webhook] No externalReference on payment", payment.id)
    return NextResponse.json({ ok: true })
  }

  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, plan")
        .eq("user_id", userId)
        .single()

      const nextBillingDate = new Date(payment.dueDate)
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            asaas_customer_id: payment.customer,
            asaas_payment_id: payment.id,
            current_period_end: nextBillingDate.toISOString(),
            overdue_since: null,
          })
          .eq("id", sub.id)
      } else {
        // New subscriber — default to evolution plan
        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: "evolution",
          price_brl: payment.value,
          status: "active",
          asaas_customer_id: payment.customer,
          asaas_subscription_id: payment.subscription ?? null,
          asaas_payment_id: payment.id,
          current_period_end: nextBillingDate.toISOString(),
          activated_at: new Date().toISOString(),
        })

        // Send Círculo Moova Discord invite
        const { data: userRow } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", userId)
          .single()

        if (userRow?.email) {
          const { subject, html } = circuloMoovaWelcomeEmail({
            brokerName: userRow.name ?? "Corretor",
            discordUrl: "https://discord.gg/t8daGDBx",
          })
          await sendEmail({ to: userRow.email, subject, html })
        }
      }
      break
    }

    case "PAYMENT_OVERDUE": {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, overdue_since")
        .eq("user_id", userId)
        .single()

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            overdue_since: sub.overdue_since ?? new Date().toISOString(),
          })
          .eq("id", sub.id)
      }
      break
    }

    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED": {
      await supabase
        .from("subscriptions")
        .update({ status: "suspended" })
        .eq("user_id", userId)
      break
    }

    case "SUBSCRIPTION_DELETED": {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("user_id", userId)
      break
    }

    default:
      break
  }

  return NextResponse.json({ ok: true })
}
