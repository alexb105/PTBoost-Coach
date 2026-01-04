"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Heart, Reply } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useMessageNotifications } from "@/hooks/use-message-notifications"
import { useLanguage } from "@/contexts/language-context"
import { formatMessageWithLinks } from "@/lib/format-message"

interface MessageLike {
  id: string
  message_id: string
  customer_id: string
  liked_by: "admin" | "customer"
  created_at: string
}

interface MessageReply {
  id: string
  message_id: string
  customer_id: string
  sender: "admin" | "customer"
  content: string
  created_at: string
}

interface Message {
  id: string
  customer_id: string
  sender: "admin" | "customer"
  content: string
  created_at: string
  likes?: MessageLike[]
  replies?: MessageReply[]
  likeCount?: number
  replyCount?: number
  isLiked?: boolean
}

export function ChatInterface() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { markAsSeen, checkForUpdates } = useMessageNotifications()
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatedReplies, setTranslatedReplies] = useState<Record<string, string>>({})
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const previousMessagesLengthRef = useRef<number>(0)
  const [adminProfilePicture, setAdminProfilePicture] = useState<string | null>(null)
  const [trainerFirstName, setTrainerFirstName] = useState<string | null>(null)
  const translatingRef = useRef<Set<string>>(new Set()) // Track messages currently being translated
  const translationQueueRef = useRef<Array<{ messageId: string; text: string }>>([])
  const isProcessingQueueRef = useRef<boolean>(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [likingMessage, setLikingMessage] = useState<string | null>(null)
  const replyingToRef = useRef<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isUserAtTop, setIsUserAtTop] = useState(false)

  const translateMessage = async (messageId: string, text: string) => {
    const isReply = messageId.startsWith('reply-')
    // For replies, use the reply ID (without 'reply-' prefix) for lookup
    const lookupKey = isReply ? messageId.replace('reply-', '') : messageId
    const translationState = isReply ? translatedReplies : translatedMessages
    
    // Don't translate if already translated
    if (translationState[lookupKey]) {
      return translationState[lookupKey]
    }

    // Don't translate if already being translated
    if (translatingRef.current.has(messageId)) {
      return text
    }

    // Don't translate empty or very short messages
    if (!text || text.trim().length < 2) {
      return text
    }

    // Always translate (even if target is English, we still need to translate foreign language messages)
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
      const isReply = messageId.startsWith('reply-')
      const translationState = isReply ? translatedReplies : translatedMessages

      // Skip if already translated or currently translating
      if (translationState[messageId] || translatingRef.current.has(messageId)) {
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
          
          // Always update translation state, even if same (to mark as processed)
          if (translated) {
            if (isReply) {
              // Store with reply ID (without 'reply-' prefix) for easier lookup
              const replyId = messageId.replace('reply-', '')
              setTranslatedReplies(prev => {
                const updated = { ...prev, [replyId]: translated }
                return updated
              })
            } else {
              setTranslatedMessages(prev => {
                const updated = { ...prev, [messageId]: translated }
                // Log for debugging in development
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Translated message ${messageId}:`, {
                    original: text.substring(0, 50),
                    translated: translated.substring(0, 50),
                    same: translated === text
                  })
                }
                return updated
              })
            }
          }
        } else {
          // Log non-OK responses for debugging
          const errorText = await response.text().catch(() => '')
          console.error(`Translation API returned status ${response.status} for message ${messageId}:`, errorText)
        }
      } catch (error) {
        // Log errors for debugging
        console.error("Translation failed for message:", {
          messageId,
          text: text.substring(0, 50),
          targetLang: language,
          error
        })
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

  const fetchMessages = async (beforeDate?: string) => {
    try {
      const url = beforeDate 
        ? `/api/customer/messages?before=${encodeURIComponent(beforeDate)}&limit=10`
        : "/api/customer/messages?limit=10"
      
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const fetchedMessages = data.messages || []
        const hasMore = data.hasMore || false
        
        if (beforeDate) {
          // Loading more - prepend older messages
          setMessages(prev => [...fetchedMessages, ...prev])
          setHasMoreMessages(hasMore)
          
          // Translate from most recent to oldest (prioritize newest messages)
          // Use setTimeout to ensure state is updated before translating
          setTimeout(() => {
            setMessages(currentMessages => {
              // Get all messages in reverse order (newest first) for translation
              const messagesToTranslate = [...currentMessages].reverse()
              messagesToTranslate.forEach((message: Message) => {
                // Only translate if not already translated and not in queue
                if (!translatedMessages[message.id] && 
                    !translatingRef.current.has(message.id) &&
                    !translationQueueRef.current.find(item => item.messageId === message.id)) {
                  translateMessage(message.id, message.content)
                }
                
                // Translate replies for this message (newest first)
                if (message.replies && message.replies.length > 0) {
                  const repliesToTranslate = [...message.replies].reverse()
                  repliesToTranslate.forEach((reply) => {
                    if (!translatedReplies[reply.id] && 
                        !translatingRef.current.has(`reply-${reply.id}`) &&
                        !translationQueueRef.current.find(item => item.messageId === `reply-${reply.id}`)) {
                      translateMessage(`reply-${reply.id}`, reply.content)
                    }
                  })
                }
              })
              // Ensure queue processing starts
              if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
                processTranslationQueue()
              }
              return currentMessages // Return unchanged
            })
          }, 100)
        } else {
          // Initial load - replace all messages
          setMessages(fetchedMessages)
          setHasMoreMessages(hasMore)
          
          // Always translate messages (to user's selected language, even if it's English)
          // Translate from most recent to oldest (reverse order)
          // Use setTimeout to ensure state is updated before translating
          setTimeout(() => {
            // Reverse the messages array to translate newest first
            const messagesToTranslate = [...fetchedMessages].reverse()
            messagesToTranslate.forEach((message: Message) => {
              // Only translate if not already translated and not in queue
              if (!translatedMessages[message.id] && 
                  !translatingRef.current.has(message.id) &&
                  !translationQueueRef.current.find(item => item.messageId === message.id)) {
                translateMessage(message.id, message.content)
              }
              
              // Translate replies for this message (newest first)
              if (message.replies && message.replies.length > 0) {
                const repliesToTranslate = [...message.replies].reverse()
                repliesToTranslate.forEach((reply) => {
                  if (!translatedReplies[reply.id] && 
                      !translatingRef.current.has(`reply-${reply.id}`) &&
                      !translationQueueRef.current.find(item => item.messageId === `reply-${reply.id}`)) {
                    translateMessage(`reply-${reply.id}`, reply.content)
                  }
                })
              }
            })
            // Ensure queue processing starts
            if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
              processTranslationQueue()
            }
          }, 100)
        }
        
        // Update last seen timestamp to the most recent message
        if (fetchedMessages.length > 0) {
          const lastMessage = fetchedMessages[fetchedMessages.length - 1]
          markAsSeen()
          // Immediately refresh unread count to clear badge
          setTimeout(() => checkForUpdates(), 100)
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

    // Immediately clear badge on mount
    markAsSeen()
    checkForUpdates()
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAdminProfilePicture = async () => {
    try {
      // First, get customer info to get trainer_id
      const customerResponse = await fetch("/api/customer/info", { credentials: 'include' })
      if (!customerResponse.ok) {
        throw new Error("Failed to fetch customer info")
      }
      const customerData = await customerResponse.json()
      const customer = customerData.customer

      if (!customer) {
        throw new Error("Customer not found")
      }

      // Get trainer_id from customer
      const trainerIdResponse = await fetch(`/api/customer/trainer`, { credentials: 'include' })
      if (!trainerIdResponse.ok) {
        throw new Error("Failed to fetch trainer info")
      }
      const trainerIdData = await trainerIdResponse.json()
      const trainerId = trainerIdData.trainer_id

      if (!trainerId) {
        // Fallback to default branding without trainer_id
        const response = await fetch("/api/branding")
        if (response.ok) {
          const data = await response.json()
          setAdminProfilePicture(data.admin_profile_picture_url || null)
          setTrainerFirstName(null)
        }
        return
      }

      // Fetch branding with trainer_id
      const response = await fetch(`/api/branding?trainer_id=${trainerId}`)
      if (response.ok) {
        const data = await response.json()
        setAdminProfilePicture(data.admin_profile_picture_url || null)
        setTrainerFirstName(data.trainer_first_name || null)
      }
    } catch (error) {
      console.error("Failed to fetch admin profile picture:", error)
      // No fallback - just use avatar initials
      setAdminProfilePicture(null)
      setTrainerFirstName(null)
    }
  }

  // Re-translate messages when language changes
  useEffect(() => {
    if (messages.length > 0) {
      // Clear existing translations and re-translate when language changes
      setTranslatedMessages({})
      setTranslatedReplies({})
      translationQueueRef.current = []
      translatingRef.current.clear()
      isProcessingQueueRef.current = false
      
      // Add all messages to queue with a delay to avoid rate limiting
      // Translate from most recent to oldest (prioritize newest messages)
      setTimeout(() => {
        const messagesToTranslate = [...messages].reverse() // Newest first
        messagesToTranslate.forEach((message) => {
          translateMessage(message.id, message.content)
          
          // Translate replies for this message (newest first)
          if (message.replies && message.replies.length > 0) {
            const repliesToTranslate = [...message.replies].reverse()
            repliesToTranslate.forEach((reply) => {
              translateMessage(`reply-${reply.id}`, reply.content)
            })
          }
        })
        // Ensure queue processing starts
        if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
          processTranslationQueue()
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Ensure new messages are translated when they arrive
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Check for untranslated messages (always translate, even to English)
      const untranslatedMessages = messages.filter(
        (message) =>
          !translatedMessages[message.id] &&
          !translatingRef.current.has(message.id) &&
          !translationQueueRef.current.find((item) => item.messageId === message.id)
      )

      if (untranslatedMessages.length > 0) {
        // Translate from most recent to oldest (prioritize newest messages)
        const messagesToTranslate = [...untranslatedMessages].reverse() // Newest first
        messagesToTranslate.forEach((message) => {
          translateMessage(message.id, message.content)
          
          // Translate replies for this message (newest first)
          if (message.replies && message.replies.length > 0) {
            const repliesToTranslate = [...message.replies].reverse()
            repliesToTranslate.forEach((reply) => {
              if (!translatedReplies[reply.id] && 
                  !translatingRef.current.has(`reply-${reply.id}`) &&
                  !translationQueueRef.current.find(item => item.messageId === `reply-${reply.id}`)) {
                translateMessage(`reply-${reply.id}`, reply.content)
              }
            })
          }
        })
        // Ensure queue processing starts
        if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
          processTranslationQueue()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, language, loading])

  // Mark messages as seen when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      const lastMessage = messages[messages.length - 1]
      markAsSeen()
      // Immediately refresh unread count to clear badge
      checkForUpdates()
    } else if (messages.length === 0 && !loading) {
      // No messages, use current timestamp to clear badge
      markAsSeen()
      checkForUpdates()
    }
  }, [messages.length, loading, markAsSeen, checkForUpdates]) // Run when messages are loaded

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

  // Check if user is at top of scroll container
  const checkIfAtTop = () => {
    const container = messagesContainerRef.current
    if (!container) return false
    
    const threshold = 100 // pixels from top
    const scrollTop = container.scrollTop
    const isAtTop = scrollTop < threshold
    
    setIsUserAtTop(isAtTop)
    return isAtTop
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return
    
    setLoadingMore(true)
    const oldestMessage = messages[0]
    const beforeDate = oldestMessage.created_at
    
    // Save current scroll position and scroll top
    const container = messagesContainerRef.current
    const previousScrollHeight = container?.scrollHeight || 0
    const previousScrollTop = container?.scrollTop || 0
    
    try {
      await fetchMessages(beforeDate)
      
      // Restore scroll position after new messages are loaded
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          const scrollDifference = newScrollHeight - previousScrollHeight
          // Set scroll position to maintain the same relative position
          container.scrollTop = previousScrollTop + scrollDifference
        }
      })
    } catch (error) {
      console.error("Error loading more messages:", error)
      toast.error("Failed to load more messages")
    } finally {
      // Delay setting loadingMore to false to prevent auto-scroll
      setTimeout(() => {
        setLoadingMore(false)
      }, 100)
    }
  }

  // Handle scroll events to track user position
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      checkIfAtBottom()
      checkIfAtTop()
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
    // Don't auto-scroll if we're loading more messages (messages added at top)
    if (loadingMore) {
      previousMessagesLengthRef.current = messages.length
      return
    }
    
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
      markAsSeen()
      // Immediately refresh unread count to clear badge
      setTimeout(() => checkForUpdates(), 100)
    }
  }, [messages, markAsSeen, checkForUpdates, loadingMore])

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

  // Scroll to reply input when replying opens
  useEffect(() => {
    if (replyingTo && replyingTo !== replyingToRef.current) {
      replyingToRef.current = replyingTo
      setTimeout(() => {
        const replyInput = document.querySelector(`[data-reply-to="${replyingTo}"]`)
        replyInput?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 150)
    } else if (!replyingTo) {
      replyingToRef.current = null
    }
  }, [replyingTo])

  const handleLikeMessage = async (messageId: string) => {
    if (likingMessage) return
    
    const message = messages.find(m => m.id === messageId)
    if (!message) return
    
    const isLiked = message.isLiked || false
    setLikingMessage(messageId)
    
    try {
      const response = await fetch(`/api/customer/messages/${messageId}/like`, {
        method: isLiked ? "DELETE" : "POST",
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error("Failed to like message")
      }
      
      // Update message in state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const newLikeCount = isLiked ? (msg.likeCount || 1) - 1 : (msg.likeCount || 0) + 1
          return {
            ...msg,
            isLiked: !isLiked,
            likeCount: newLikeCount,
          }
        }
        return msg
      }))
    } catch (error: any) {
      console.error("Error liking message:", error)
      toast.error(error.message || "Failed to like message")
    } finally {
      setLikingMessage(null)
    }
  }

  const handleSendReply = async (messageId: string) => {
    if (!replyContent.trim() || sendingReply) return
    
    const content = replyContent.trim()
    setReplyContent("")
    setSendingReply(true)
    
    try {
      const response = await fetch(`/api/customer/messages/${messageId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error("Failed to send reply")
      }
      
      const data = await response.json()
      const newReply = data.reply
      
      // Update message with new reply
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          // Translate the new reply
          translateMessage(`reply-${newReply.id}`, newReply.content)
          
          return {
            ...msg,
            replies: [...(msg.replies || []), newReply],
            replyCount: (msg.replyCount || 0) + 1,
          }
        }
        return msg
      }))
      
      setReplyingTo(null)
      toast.success("Reply sent")
    } catch (error: any) {
      console.error("Error sending reply:", error)
      toast.error(error.message || "Failed to send reply")
    } finally {
      setSendingReply(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("")
    setSending(true)

    // Optimistically add a temporary message to the UI
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      customer_id: "",
      sender: "customer",
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch("/api/customer/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to send messages")
        } else {
          throw new Error("Failed to send message")
        }
        // Remove optimistic message and restore input
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
        setNewMessage(messageContent)
      } else {
        const data = await response.json()
        const sentMessage = data.message
        
        // Replace optimistic message with real one and sort
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempId)
          const updated = [...filtered, sentMessage]
          // Sort by created_at to ensure proper order
          return updated.sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
        })
        
        // Translate the new message
        translateMessage(sentMessage.id, sentMessage.content)
        
        // Update last seen and scroll to bottom
        markAsSeen()
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error(error.message || "Failed to send message")
      // Remove optimistic message and restore input
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Avatar>
            {adminProfilePicture && <AvatarImage src={adminProfilePicture} />}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {trainerFirstName ? trainerFirstName.charAt(0).toUpperCase() : "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-foreground">
              {trainerFirstName ? `Coach ${trainerFirstName}` : "Coach"}
            </h1>
            <p className="text-xs text-muted-foreground">{t("chat.online")}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0" ref={messagesContainerRef}>
        <div className="mx-auto max-w-2xl space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t("chat.noMessages")}</p>
            </div>
          ) : (
            <>
              {/* Load More Button */}
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Messages"
                    )}
                  </Button>
                </div>
              )}
              {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex flex-col ${message.sender === "customer" ? "items-end" : "items-start"} ${
                  replyingTo === message.id ? "ring-2 ring-primary/30 rounded-lg p-2 -m-2" : ""
                } transition-all`}
              >
                <div className={`flex max-w-[80%] gap-2 ${message.sender === "customer" ? "flex-row-reverse" : "flex-row"}`}>
                  {message.sender === "admin" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {adminProfilePicture && <AvatarImage src={adminProfilePicture} />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {trainerFirstName ? trainerFirstName.charAt(0).toUpperCase() : "C"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-1 flex-1 min-w-0">
                    <Card
                      className={`p-3 ${message.sender === "customer" ? "bg-primary text-primary-foreground" : "bg-card"} ${
                        replyingTo === message.id ? "ring-2 ring-primary/50" : ""
                      } transition-all`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {formatMessageWithLinks(translatedMessages[message.id] || message.content)}
                      </p>
                    </Card>
                    <div className={`flex items-center gap-2 flex-wrap ${message.sender === "customer" ? "justify-end" : "justify-start"}`}>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-muted"
                        onClick={() => handleLikeMessage(message.id)}
                        disabled={likingMessage === message.id}
                      >
                        <Heart className={`h-3.5 w-3.5 mr-1 transition-colors ${message.isLiked ? "fill-red-500 text-red-500" : ""}`} />
                        {message.likeCount || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs hover:bg-muted ${
                          replyingTo === message.id ? "bg-primary/10 text-primary" : ""
                        } ${(message.replyCount || 0) > 0 ? "font-semibold" : ""}`}
                        onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                      >
                        <Reply className={`h-3.5 w-3.5 mr-1 ${replyingTo === message.id ? "text-primary" : ""}`} />
                        {message.replyCount || 0}
                      </Button>
                    </div>
                    
                    {/* Replies */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="mt-3 space-y-2 ml-4 border-l-2 border-primary/30 pl-3">
                        {message.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2 group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-foreground">
                                  {reply.sender === "admin" ? "Coach" : "You"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.created_at).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <Card className="p-2 bg-muted/50 border-muted">
                                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                                  {formatMessageWithLinks(translatedReplies[reply.id] || reply.content)}
                                </p>
                              </Card>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                            {/* Reply Input */}
                            {replyingTo === message.id && (
                              <div className="mt-3 ml-4 space-y-2" data-reply-to={message.id}>
                                <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-2">
                          <div className="flex items-start gap-2 mb-2">
                            <Reply className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-primary mb-1">Replying to:</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {formatMessageWithLinks(translatedMessages[message.id] || message.content)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendReply(message.id)
                                }
                              }}
                              placeholder="Type your reply..."
                              className="flex-1 text-sm h-9 bg-background"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSendReply(message.id)}
                              disabled={!replyContent.trim() || sendingReply}
                              className="h-9"
                            >
                              {sendingReply ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyContent("")
                              }}
                              className="h-9"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card p-3 sm:p-4 pb-24">
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
