import { ChatInterface } from "@/components/chat-interface"
import { ClientHeader } from "@/components/client-header"

export default function ChatPage() {
  return (
    <main className="flex flex-col h-[100dvh] sm:h-screen">
      <ClientHeader />
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface />
      </div>
    </main>
  )
}
