import { ChatInterface } from "@/components/chat-interface"
import { ClientHeader } from "@/components/client-header"

export default function ChatPage() {
  return (
    <main className="flex min-h-screen flex-col pb-20">
      <ClientHeader />
      <ChatInterface />
    </main>
  )
}
