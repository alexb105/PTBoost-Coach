import { ChatInterface } from "@/components/chat-interface"
import { ClientHeader } from "@/components/client-header"

export default function ChatPage() {
  return (
    <main className="flex flex-col h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <ClientHeader />
      <div className="flex-1 overflow-hidden min-h-0">
        <ChatInterface />
      </div>
    </main>
  )
}
