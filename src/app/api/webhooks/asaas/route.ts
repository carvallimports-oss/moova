import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Asaas sends payment events — verify token before processing
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
    externalReference?: string // we store user_id here
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
    // Cannot map to a user — log and return 200 to prevent Asaas retries
    console.warn("[asaas-webhook] No externalReference on payment", payment.id)
    return NextResponse.json({ ok: true })
  }

  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      // Activate or extend subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, trial_ends_at")
        .eq("user_id", userId)
        .single()

      const now = new Date()
      const nextBillingDate = new Date(payment.dueDate)
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            asaas_payment_id: payment.id,
            current_period_end: nextBillingDate.toISOString(),
          })
          .eq("id", sub.id)
      } else {
        await supabase.from("subscriptions").insert({
          user_id: userId,
          status: "active",
          plan: "starter",
          asaas_customer_id: payment.customer,
          asaas_subscription_id: payment.subscription ?? null,
          asaas_payment_id: payment.id,
          current_period_end: nextBillingDate.toISOString(),
        })
      }
      break
    }

    case "PAYMENT_OVERDUE": {
      // Grace period — mark as past_due, not suspended yet
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("user_id", userId)
      break
    }

    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED": {
      // Suspend access
      await supabase
        .from("subscriptions")
        .update({ status: "suspended" })
        .eq("user_id", userId)
      break
    }

    case "SUBSCRIPTION_DELETED": {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", userId)
      break
    }

    default:
      // Unknown event — acknowledge but take no action
      break
  }

  return NextResponse.json({ ok: true })
}
