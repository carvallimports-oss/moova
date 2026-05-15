export const dynamic = "force-dynamic"

import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processWhatsAppMessage } from "@/lib/inngest/functions/process-message"
import { aiHealthCheck } from "@/lib/inngest/functions/health-check"
import { sendDiagnosticoMarco, checkDiagnosticoMarcos } from "@/lib/inngest/functions/diagnostico-marcos"
import { sendPactoMarco, checkPactoMarcos } from "@/lib/inngest/functions/pacto-marcos"
import { reactivateColdLeads } from "@/lib/inngest/functions/reactivate-cold-leads"
import { notifyDegradedMode } from "@/lib/inngest/functions/notify-degraded"
import { generateDiagnosticoReport } from "@/lib/inngest/functions/diagnostico-report"
import { sendApprovedMessage } from "@/lib/inngest/functions/send-approved-message"
import { visitReminders } from "@/lib/inngest/functions/visit-reminders"
import { classifyImportedLeads } from "@/lib/inngest/functions/classify-imported-leads"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWhatsAppMessage,
    aiHealthCheck,
    sendDiagnosticoMarco,
    checkDiagnosticoMarcos,
    sendPactoMarco,
    checkPactoMarcos,
    reactivateColdLeads,
    notifyDegradedMode,
    generateDiagnosticoReport,
    sendApprovedMessage,
    visitReminders,
    classifyImportedLeads,
  ],
})
