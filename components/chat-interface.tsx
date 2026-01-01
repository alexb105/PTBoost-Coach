"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useMessageNotifications } from "@/hooks/use-message-notifications"
import { useLanguage } from "@/contexts/language-context"

interface Message {
  id: string
  customer_id: string
  sender: "admin" | "customer"
  content: string
  created_at: string
}

export function ChatInterface() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { updateLastSeen, fetchUnreadCount } = useMessageNotifications({ isViewingChat: true })
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const previousMessagesLengthRef = useRef<number>(0)
  const [adminProfilePicture, setAdminProfilePicture] = useState<string | null>(null)
  const translatingRef = useRef<Set<string>>(new Set()) // Track messages currently being translated
  const translationQueueRef = useRef<Array<{ messageId: string; text: string }>>([])
  const isProcessingQueueRef = useRef<boolean>(false)

  const translateMessage = async (messageId: string, text: string) => {
    // Don't translate if language is English or if already translated
    if (language === 'en' || translatedMessages[messageId]) {
      return translatedMessages[messageId] || text
    }

    // Don't translate if already being translated
    if (translatingRef.current.has(messageId)) {
      return text
    }

    // Don't translate empty or very short messages
    if (!text || text.trim().length < 2) {
      return text
    }

    // Add to queue instead of translating immediately
    if (!translationQueueRef.current.find(item => item.messageId === messageId)) {
      translationQueueRef.current.push({ messageId, text })
    }

    // Process queue if not already processing
    if (!isProcessingQueueRef.current) {
      processTranslationQueue()
    }

    return text
  }

  const processTranslationQueue = async () => {
    if (isProcessingQueueRef.current || translationQueueRef.current.length === 0) {
      return
    }

    // Don't process if page is hidden
    if (typeof document === 'undefined' || document.hidden) {
      return
    }

    isProcessingQueueRef.current = true

    while (translationQueueRef.current.length > 0) {
      // Stop processing if page becomes hidden or document is unavailable
      if (typeof document === 'undefined' || document.hidden) {
        isProcessingQueueRef.current = false
        return
      }

      const item = translationQueueRef.current.shift()
      if (!item) break

      const { messageId, text } = item

      // Skip if already translated or currently translating
      if (translatedMessages[messageId] || translatingRef.current.has(messageId)) {
        continue
      }

      // Mark as being translated
      translatingRef.current.add(messageId)

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: language }),
        })

        if (response.ok) {
          const data = await response.json()
          const translated = data.translatedText || text
          // Only update if we got a valid translation
          if (translated && translated !== text) {
            setTranslatedMessages(prev => ({ ...prev, [messageId]: translated }))
          }
        }
      } catch (error) {
        // Silently fail - just use original text
        console.debug("Translation failed for message, using original text:", error)
      } finally {
        // Remove from translating set
        translatingRef.current.delete(messageId)
      }

      // Add delay between requests to avoid rate limiting (500ms between each translation)
      if (translationQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    isProcessingQueueRef.current = false
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/customer/messages")
      if (response.ok) {
        const data = await response.json()
        const fetchedMessages = data.messages || []
        setMessages(fetchedMessages)
        
        // Translate messages if needed (only new ones)
        if (language !== 'en') {
          fetchedMessages.forEach((message: Message) => {
            // Only translate if not already translated and not in queue
            if (!translatedMessages[message.id] && 
                !translatingRef.current.has(message.id) &&
                !translationQueueRef.current.find(item => item.messageId === message.id)) {
              translateMessage(message.id, message.content)
            }
          })
        }
        
        // Update last seen timestamp to the most recent message
        if (fetchedMessages.length > 0) {
          const lastMessage = fetchedMessages[fetchedMessages.length - 1]
          updateLastSeen(lastMessage.created_at)
          // Immediately refresh unread count to clear badge
          setTimeout(() => fetchUnreadCount(), 100)
        }
      } else if (response.status === 401) {
        // Unauthorized - user not logged in
        toast.error("Please log in to view messages")
      } else {
        throw new Error("Failed to fetch messages")
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error)
      if (loading) {
        // Only show error toast on initial load
        toast.error("Failed to load messages")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchMessagesSafe = async () => {
      if (isMounted) {
        await fetchMessages()
      }
    }

    fetchMessagesSafe()
    fetchAdminProfilePicture()

    // Poll for new messages every 10 seconds (reduced from 3s to reduce server load)
    // Only poll if page is visible
    const interval = setInterval(() => {
      // Only poll if page is visible and component is mounted
      if (typeof document !== 'undefined' && !document.hidden && isMounted) {
        fetchMessagesSafe()
      }
    }, 10000) // Increased to 10 seconds

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const fetchAdminProfilePicture = async () => {
    try {
      const response = await fetch("/api/branding")
      if (response.ok) {
        const data = await response.json()
        setAdminProfilePicture(data.admin_profile_picture_url || "/trainer-avatar.jpg")
      }
    } catch (error) {
      console.error("Failed to fetch admin profile picture:", error)
      // Fallback to default
      setAdminProfilePicture("/trainer-avatar.jpg")
    }
  }

  // Re-translate messages when language changes
  useEffect(() => {
    if (language === 'en') {
      // Clear translations when switching back to English
      setTranslatedMessages({})
      translationQueueRef.current = []
      translatingRef.current.clear()
      isProcessingQueueRef.current = false
    } else if (language !== 'en' && messages.length > 0) {
      // Clear existing translations and re-translate when language changes
      setTranslatedMessages({})
      translationQueueRef.current = []
      translatingRef.current.clear()
      isProcessingQueueRef.current = false
      
      // Add all messages to queue with a delay to avoid rate limiting
      setTimeout(() => {
        messages.forEach((message) => {
          translateMessage(message.id, message.content)
        })
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Mark messages as seen immediately when chat page is opened
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      const lastMessage = messages[messages.length - 1]
      updateLastSeen(lastMessage.created_at)
      // Immediately refresh unread count to clear badge
      fetchUnreadCount()
    }
  }, [messages.length, loading, updateLastSeen, fetchUnreadCount]) // Run when messages are loaded

  // Check if user is at bottom of scroll container
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 150 // pixels from bottom
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isAtBottom = distanceFromBottom < threshold
    
    setIsUserAtBottom(isAtBottom)
    return isAtBottom
  }

  // Handle scroll events to track user position
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      checkIfAtBottom()
    }

    // Also check on initial render
    const timeoutId = setTimeout(() => {
      checkIfAtBottom()
    }, 100)

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [])

  // Auto-scroll to bottom only if user is already at bottom
  useEffect(() => {
    // Only auto-scroll if messages actually changed (new message added)
    const hasNewMessage = messages.length > previousMessagesLengthRef.current
    previousMessagesLengthRef.current = messages.length
    
    // Check scroll position right before deciding to scroll
    const shouldScroll = checkIfAtBottom()
    
    // Only auto-scroll if user is at the bottom AND there's a new message
    if (shouldScroll && messages.length > 0 && hasNewMessage) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    }
    
    // Mark messages as seen when viewing chat
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      updateLastSeen(lastMessage.created_at)
      // Immediately refresh unread count to clear badge
      setTimeout(() => fetchUnreadCount(), 100)
    }
  }, [messages, updateLastSeen, fetchUnreadCount])

  // Auto-scroll to bottom on initial load only
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
        setIsUserAtBottom(true)
      }, 100)
    }
  }, [loading]) // Only on initial load

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const response = await fetch("/api/customer/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to send messages")
        } else {
          throw new Error("Failed to send message")
        }
        // Restore message on error
        setNewMessage(messageContent)
      } else {
        // Refresh messages to show the new one
        await fetchMessages()
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error(error.message || "Failed to send message")
      // Restore message on error
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Avatar>
            <AvatarImage src={adminProfilePicture || "/trainer-avatar.jpg"} />
            <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-foreground">{t("chat.coachName")}</h1>
            <p className="text-xs text-muted-foreground">{t("chat.online")}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
        <div className="mx-auto max-w-2xl space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t("chat.noMessages")}</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex max-w-[80%] gap-2 ${message.sender === "customer" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {message.sender === "admin" && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={adminProfilePicture || "/trainer-avatar.jpg"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-1">
                    <Card
                      className={`p-3 ${message.sender === "customer" ? "bg-primary text-primary-foreground" : "bg-card"}`}
                    >
                      <p className="text-sm leading-relaxed">
                        {language === 'en' 
                          ? message.content 
                          : (translatedMessages[message.id] || message.content)
                        }
                      </p>
                    </Card>
                    <p
                      className={`text-xs text-muted-foreground ${message.sender === "customer" ? "text-right" : "text-left"}`}
                    >
                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4 pb-24">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={t("chat.typeMessage")}
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!newMessage.trim() || sending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
