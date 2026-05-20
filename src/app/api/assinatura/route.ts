import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const D4SIGN_BASE = "https://sandbox.d4sign.com.br/api/v1"

function d4signHeaders() {
  return {
    "Content-Type": "application/json",
    tokenAPI: process.env.D4SIGN_TOKEN_API ?? "",
    cryptKey: process.env.D4SIGN_CRYPT_KEY ?? "",
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("signature_documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (status && status !== "todos") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, document_type, contract_id, signatories, file_url } = body

  // Create document record
  const { data: doc, error } = await supabase
    .from("signature_documents")
    .insert({
      user_id: user.id,
      contract_id: contract_id ?? null,
      title,
      document_type,
      signatories: signatories ?? [],
      file_url: file_url ?? null,
      status: "rascunho",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(doc, { status: 201 })
}
