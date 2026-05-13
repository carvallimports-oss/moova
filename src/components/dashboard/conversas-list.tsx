"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MessageSquare, ThumbsUp, User } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type Conversation = {
  id: string
  is_active: boolean
  broker_took_over: boolean
  updated_at: string
  leads: { id: string; name: string; phone: string; temperature: string; status: string } | null
  messages: { id: string; content: string; sender: string; requires_approval: boolean; created_at: string; flags: string[] }[]
}

const tempColor: Record<string, string> = {
  QUENTE: "bg-red-50 text-red-700 border-red-200",
  MORNO: "bg-orange-50 text-orange-700 border-orange-200",
  FRIO: "bg-blue-50 text-blue-700 border-blue-200",
  INERTE: "bg-gray-50 text-gray-500 border-gray-200",
}

export function ConversasList({ conversations }: { conversations: Conversation[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16 text-[#8A8A8A]">
        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma conversa ativa ainda.</p>
        <p className="text-xs mt-1">A Cora vai aparecer aqui quando o WhatsApp estiver conectado.</p>
      </div>
    )
  }

  const selectedConv = conversations.find((c) => c.id === selected)

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)]">
      {/* Lista */}
      <div className="space-y-2 overflow-y-auto pr-1">
        {conversations.map((conv) => {
          const lastMsg = conv.messages?.at(-1)
          const pendingApproval = conv.messages?.some((m) => m.requires_approval)
          return (
            <Card
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={cn(
                "cursor-pointer border transition-all",
                selected === conv.id
                  ? "border-[#2D4A3E] bg-[#2D4A3E]/5"
                  : "border-[#E0D8CE] hover:border-[#2D4A3E]/40",
                pendingApproval && "border-[#B87333]/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[#2A2A2A] truncate">
                        {conv.leads?.name ?? "Lead desconhecido"}
                      </p>
                      {conv.leads?.temperature && (
                        <Badge className={cn("text-[10px] border px-1.5 py-0", tempColor[conv.leads.temperature])}>
                          {conv.leads.temperature}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">{conv.leads?.phone}</p>
                    {lastMsg && (
                      <p className="text-xs text-[#5A5A5A] mt-1.5 truncate">
                        <span className={cn("font-medium mr-1", lastMsg.sender === "cora" ? "text-[#2D4A3E]" : "text-[#B87333]")}>
                          {lastMsg.sender === "cora" ? "Cora:" : lastMsg.sender === "corretor" ? "Você:" : "Lead:"}
                        </span>
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-[10px] text-[#8A8A8A]">
                      {new Date(conv.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {pendingApproval && (
                      <span className="w-2 h-2 rounded-full bg-[#B87333]" />
                    )}
                    {conv.broker_took_over && (
                      <User className="w-3 h-3 text-[#2D4A3E]" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detalhe da conversa */}
      <Card className="border-[#E0D8CE] flex flex-col overflow-hidden">
        {selectedConv ? (
          <>
            {/* Header do chat */}
            <div className="px-5 py-4 border-b border-[#E0D8CE] flex items-center justify-between">
              <div>
                <p className="font-medium text-[#2A2A2A]">{selectedConv.leads?.name}</p>
                <p className="text-xs text-[#8A8A8A]">{selectedConv.leads?.phone}</p>
              </div>
              <Button size="sm" variant="outline" className="text-[#2D4A3E] border-[#E0D8CE] text-xs">
                <User className="w-3.5 h-3.5 mr-1.5" />
                Assumir conversa
              </Button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedConv.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.sender === "lead"
                      ? "bg-[#EAE3D9] text-[#2A2A2A] self-start"
                      : msg.sender === "cora"
                      ? "bg-[#2D4A3E] text-white self-end ml-auto"
                      : "bg-[#B87333] text-white self-end ml-auto"
                  )}
                >
                  {msg.requires_approval && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] opacity-70">
                      <ThumbsUp className="w-3 h-3" />
                      Aguardando aprovação
                    </div>
                  )}
                  {msg.content}
                  <p className="text-[10px] opacity-60 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#8A8A8A]">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
