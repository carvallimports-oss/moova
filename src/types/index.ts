export type WhatsAppProvider = "evolution" | "bsp"

// ── Camada 2 — C2.0 ──────────────────────────────────────────────────────────

export type SubscriptionPlan = "evolution" | "bsp" | "opera" | "inteligencia" | "maestria"

export type LandlordStatus =
  | "prospeccao"
  | "em_contato"
  | "negociando_exclusividade"
  | "captado"
  | "em_publicacao"
  | "vendido"
  | "retomado"

export type LandlordOrigin =
  | "portal_moova"
  | "contato_existente"
  | "anuncio_publico"
  | "whatsapp_opt_in"

export interface LandlordProfile {
  id: string
  user_id: string
  name: string
  phone?: string
  email?: string
  cpf?: string
  status: LandlordStatus
  exclusivity: boolean
  property_id?: string
  notes?: string
  next_action?: string
  next_action_at?: string
  origin?: LandlordOrigin
  optin_at?: string
  optin_source?: string
  diario_optin: boolean
  diario_contact?: "whatsapp" | "email"
  created_at: string
  updated_at: string
}

export type PropertyMediaType =
  | "photo_original"
  | "photo_edited"
  | "video_reel"
  | "tour_360"
  | "description_ai"

export interface PropertyMedia {
  id: string
  property_id: string
  user_id: string
  type: PropertyMediaType
  url: string
  storage_path?: string
  metadata: Record<string, unknown>
  created_at: string
}

export type SocialPlatform =
  | "instagram_stories"
  | "instagram_feed"
  | "instagram_reels"
  | "facebook_post"
  | "facebook_marketplace"
  | "tiktok_reels"

export type SocialPostStatus = "pending" | "approved" | "rejected" | "published"

export interface SocialPostDraft {
  id: string
  user_id: string
  property_id?: string
  platform: SocialPlatform
  caption?: string
  media_url?: string
  status: SocialPostStatus
  approved_at?: string
  published_at?: string
  created_at: string
}

export type PortalName = "zap" | "vivareal" | "imovelweb" | "chavesnamao" | "olx"

export interface PortalListing {
  id: string
  property_id: string
  user_id: string
  portal: PortalName
  external_listing_id?: string
  status: "pending" | "active" | "error" | "removed"
  last_synced_at?: string
  error_message?: string
  created_at: string
}

export interface UpgradeOffer {
  id: string
  user_id: string
  from_plan: string
  to_plan: string
  sent_at: string
  responded_at?: string
  response?: "accepted" | "rejected" | "later"
  sent_via: "nara" | "dashboard" | "email"
}

// ── Camada 2 — C2.1/C2.2 ────────────────────────────────────────────────────

export type ServiceStatus = "pending" | "in_progress" | "completed" | "cancelled"

export interface ExtraService {
  id: string
  user_id: string
  name: string
  description?: string
  price?: number
  client_name?: string
  client_phone?: string
  due_date?: string
  notes?: string
  status: ServiceStatus
  created_at: string
  updated_at: string
}

export interface NegotiationSession {
  id: string
  user_id: string
  lead_id?: string
  context: string
  briefing: string
  meeting_at?: string
  outcome?: "fechou" | "perdeu" | "adiou" | "pendente"
  created_at: string
}

export interface LegalConsultation {
  id: string
  user_id: string
  category: "geral" | "contrato" | "distrato" | "locacao" | "despejo" | "iptu" | "itbi"
  question: string
  answer: string
  disclaimer: string
  created_at: string
}

export type RoomCondition = "otimo" | "bom" | "regular" | "ruim" | "pessimo"

export interface InspectionRoom {
  name: string
  condition: RoomCondition
  observations?: string
}

export interface InspectionSupport {
  id: string
  user_id: string
  property_id?: string
  address: string
  property_type?: string
  area_sqm?: number
  rooms: InspectionRoom[]
  general_observations?: string
  report: string
  status: "pending" | "ready"
  created_at: string
}

export interface PropertyEstimateResult {
  price_min: number
  price_max: number
  price_suggested: number
  price_per_sqm: number
  margin_of_error: string
  market_context: string
  factors_positive: string[]
  factors_negative: string[]
  comparables: Array<{ description: string; price: number; distance: string }>
  recommendation: string
}

export interface PropertyEstimate {
  id: string
  user_id: string
  property_id?: string
  address: string
  city: string
  state: string
  property_type: string
  area_sqm: number
  bedrooms?: number
  condition: string
  extra_notes?: string
  result: PropertyEstimateResult
  disclaimer: string
  created_at: string
}

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
