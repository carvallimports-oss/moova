const BASE_URL = "https://api.asaas.com/v3"

function headers() {
  return {
    "Content-Type": "application/json",
    "access_token": process.env.ASAAS_API_KEY ?? "",
  }
}

export type AsaasCustomer = {
  id: string
  name: string
  cpfCnpj?: string
  email?: string
  mobilePhone?: string
  externalReference?: string
}

export type AsaasSubscription = {
  id: string
  customer: string
  billingType: string
  value: number
  nextDueDate: string
  status: string
}

export async function createCustomer(params: {
  name: string
  email?: string
  mobilePhone?: string
  userId: string
}): Promise<AsaasCustomer> {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      mobilePhone: params.mobilePhone,
      externalReference: params.userId,
    }),
  })
  if (!res.ok) throw new Error(`Asaas createCustomer failed: ${res.status}`)
  return res.json()
}

export async function createSubscription(params: {
  customerId: string
  value: number
  nextDueDate: string
  description?: string
}): Promise<AsaasSubscription> {
  const res = await fetch(`${BASE_URL}/subscriptions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      customer: params.customerId,
      billingType: "BOLETO",
      value: params.value,
      nextDueDate: params.nextDueDate,
      cycle: "MONTHLY",
      description: params.description ?? "Moova – assinatura mensal",
    }),
  })
  if (!res.ok) throw new Error(`Asaas createSubscription failed: ${res.status}`)
  return res.json()
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Asaas cancelSubscription failed: ${res.status}`)
}

export async function getCustomerByExternalRef(userId: string): Promise<AsaasCustomer | null> {
  const res = await fetch(`${BASE_URL}/customers?externalReference=${userId}`, {
    headers: headers(),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.[0] ?? null
}
