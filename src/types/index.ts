export type WhatsAppProvider = "evolution" | "bsp"

export type LeadStatus = "novo" | "qualificado" | "em_consideracao" | "visita_agendada" | "visitou" | "em_negociacao" | "fechou" | "perdido"

export type LeadTemperature = "QUENTE" | "MORNO" | "FRIO" | "INERTE"

export type PactoScenario = "A" | "B" | "C" | "D"

export type NaraFlag =
  | "nara_self_correction"
  | "nara_alert"
  | "lead_abusive"
  | "human_approval_required"

export interface NaraTone {
  formality: "formal" | "informal"
  customPrompt?: string
}

export interface User {
  id: string
  email: string
  name: string
  creci: string
  phone: string
  whatsapp_provider: WhatsAppProvider
  nara_tone: NaraTone
  human_approval_active: boolean
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  name: string
  phone: string
  status: LeadStatus
  temperature: LeadTemperature
  estimated_budget?: number
  region?: string
  last_contact_at?: string
  next_action?: string
  notes?: string
  is_vip?: boolean
  lgpd_optout_at?: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  lead_id: string
  user_id: string
  content: string
  type: "text" | "audio" | "image"
  sender: "lead" | "nara" | "corretor"
  flags: NaraFlag[]
  requires_approval: boolean
  approved_at?: string
  created_at: string
}

export interface DiagnosticoNara14d {
  id: string
  user_id: string
  started_at: string
  ends_at: string
  leads_attended: number
  cold_leads_reactivated: number
  visits_scheduled: number
  estimated_commission: number
  converted_to_subscription: boolean
  report_shared: boolean
}

export interface PactoMoova90 {
  id: string
  user_id: string
  started_at: string
  ends_at: string
  scenario: PactoScenario | null
  commission_achieved: number
  good_faith_score: number
  refund_amount?: number
  resolved_at?: string
}
