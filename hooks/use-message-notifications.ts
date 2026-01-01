"use client"

import { useState, useEffect, useCallback } from 'react'

const LAST_SEEN_KEY = 'chat_last_seen'

interface UseMessageNotificationsOptions {
  customerId?: string
  isAdmin?: boolean
  enabled?: boolean
}

export function useMessageNotifications({
  customerId,
  isAdmin = false,
  enabled = true,
}: UseMessageNotificationsOptions = {}) {
  const [hasUnread, setHasUnread] = useState(false)

  // Get storage key based on context
  const getStorageKey = useCallback(() => {
    return isAdmin && customerId 
      ? `${LAST_SEEN_KEY}_admin_${customerId}`
      : LAST_SEEN_KEY
  }, [isAdmin, customerId])

  // Mark chat as seen (clears the red dot)
  const markAsSeen = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStorageKey(), new Date().toISOString())
    setHasUnread(false)
  }, [getStorageKey])

  // Check for unread messages
  const checkForUpdates = useCallback(async () => {
    if (!enabled) return

    try {
      const lastSeen = typeof window !== 'undefined' 
        ? localStorage.getItem(getStorageKey()) 
        : null
      
      const url = isAdmin && customerId
        ? `/api/admin/customers/${customerId}/messages/unread${lastSeen ? `?lastSeen=${encodeURIComponent(lastSeen)}` : ''}`
        : `/api/customer/messages/unread${lastSeen ? `?lastSeen=${encodeURIComponent(lastSeen)}` : ''}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setHasUnread(data.hasUnread === true)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }, [enabled, isAdmin, customerId, getStorageKey])

  // Poll for updates
  useEffect(() => {
    if (!enabled) return

    checkForUpdates()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkForUpdates()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [enabled, checkForUpdates])

  return {
    hasUnread,
    markAsSeen,
    checkForUpdates,
  }
}
