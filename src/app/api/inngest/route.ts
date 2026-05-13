export const dynamic = "force-dynamic"

import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processWhatsAppMessage } from "@/lib/inngest/functions/process-message"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processWhatsAppMessage],
})
