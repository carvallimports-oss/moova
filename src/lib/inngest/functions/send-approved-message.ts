import { inngest } from "@/lib/inngest/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhatsAppProvider } from "@/lib/whatsapp/provider"

export const sendApprovedMessage = inngest.createFunction(
  {
    id: "send-approved-message",
    retries: 3,
    triggers: [{ event: "message/approved" }],
  },
  async ({ event, step }) => {
    const { messageId, userId } = event.data as { messageId: string; userId: string }
    const supabase = createAdminClient()

    const { message, conversation, waAccount } = await step.run("fetch-context", async () => {
      const { data: msg } = await supabase
        .from("messages")
        .select("content, conversation_id")
        .eq("id", messageId)
        .single()

      const { data: conv } = await supabase
        .from("conversations")
        .select("lead_id")
        .eq("id", msg?.conversation_id)
        .single()

      const { data: lead } = await supabase
        .from("leads")
        .select("phone")
        .eq("id", conv?.lead_id)
        .single()

      const { data: wa } = await supabase
        .from("whatsapp_accounts")
        .select("instance_name, provider, bsp_phone_number_id, bsp_access_token")
        .eq("user_id", userId)
        .single()

      return {
        message: msg,
        conversation: { ...conv, phone: lead?.phone },
        waAccount: wa,
      }
    })

    if (!message?.content || !conversation?.phone) {
      throw new Error("Missing data to send approved message")
    }

    await step.run("send-whatsapp", async () => {
      const providerType = (waAccount?.provider ?? "evolution") as "evolution" | "bsp"
      const provider = createWhatsAppProvider(providerType, {
        instanceName: waAccount?.instance_name ?? undefined,
        phoneNumberId: waAccount?.bsp_phone_number_id ?? undefined,
        accessToken: waAccount?.bsp_access_token ?? undefined,
      })
      await provider.sendMessage({
        to: conversation.phone!,
        text: message.content,
      })
    })

    await step.run("mark-sent", async () => {
      await supabase
        .from("messages")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", messageId)
    })

    return { sent: true, messageId }
  }
)
