import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createCustomer, createSubscription, getCustomerByExternalRef } from "@/lib/asaas/client"

export const dynamic = "force-dynamic"

const schema = z.object({
  plan: z.enum(["starter", "pro"]),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
})

const PLAN_PRICES: Record<string, number> = {
  starter: 799,
  pro: 1199,
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { plan, name, email, phone } = parsed.data

  // Check for existing subscription
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .single()

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Você já tem uma assinatura ativa" }, { status: 409 })
  }

  // Create or find Asaas customer
  let customer = await getCustomerByExternalRef(user.id)
  if (!customer) {
    customer = await createCustomer({ name, email, mobilePhone: phone, userId: user.id })
  }

  // Next due date = first of next month
  const nextDueDate = new Date()
  nextDueDate.setMonth(nextDueDate.getMonth() + 1)
  nextDueDate.setDate(1)
  const dueDateStr = nextDueDate.toISOString().slice(0, 10)

  const subscription = await createSubscription({
    customerId: customer.id,
    value: PLAN_PRICES[plan],
    nextDueDate: dueDateStr,
    description: `Moova ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${name}`,
  })

  // Upsert subscription in DB
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: user.id,
      plan,
      status: "trial",
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, subscription: sub })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}
