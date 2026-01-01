"use client"

import { useState, useEffect, useCallback } from 'react'

const LAST_SEEN_KEY = 'last_seen_message_timestamp'
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_requested'

interface UseMessageNotificationsOptions {
  customerId?: string // For admin, pass the customer ID
  isAdmin?: boolean
  enabled?: boolean
  isViewingChat?: boolean // Set to true when user is actively viewing the chat
}

export function useMessageNotifications({
  customerId,
  isAdmin = false,
  enabled = true,
  isViewingChat = false,
}: UseMessageNotificationsOptions = {}) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Get last seen timestamp from localStorage
  const getLastSeen = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    
    const key = isAdmin && customerId 
      ? `${LAST_SEEN_KEY}_admin_${customerId}`
      : LAST_SEEN_KEY
    
    return localStorage.getItem(key)
  }, [isAdmin, customerId])

  // Update last seen timestamp
  const updateLastSeen = useCallback((timestamp: string) => {
    if (typeof window === 'undefined') return
    
    const key = isAdmin && customerId 
      ? `${LAST_SEEN_KEY}_admin_${customerId}`
      : LAST_SEEN_KEY
    
    localStorage.setItem(key, timestamp)
  }, [isAdmin, customerId])

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      return true
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      return false
    }

    // Check if we've already asked
    const hasAsked = localStorage.getItem(NOTIFICATION_PERMISSION_KEY)
    if (hasAsked && Notification.permission === 'default') {
      setNotificationPermission('default')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true')
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [])

  // Show browser notification
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icon.svg',
        badge: '/icon.svg',
        tag: 'message-notification',
        requireInteraction: false,
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  }, [])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!enabled) return

    try {
      const lastSeen = getLastSeen()
      const url = isAdmin && customerId
        ? `/api/admin/customers/${customerId}/messages/unread${lastSeen ? `?lastSeen=${encodeURIComponent(lastSeen)}` : ''}`
        : `/api/customer/messages/unread${lastSeen ? `?lastSeen=${encodeURIComponent(lastSeen)}` : ''}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const newCount = data.unreadCount || 0
        
        setUnreadCount((prevCount) => {
          // If count increased, show notification (but not if user is viewing chat)
          if (newCount > prevCount && newCount > 0 && notificationPermission === 'granted' && !isViewingChat) {
            const senderName = isAdmin ? 'Customer' : 'Trainer'
            showNotification(
              'New Message',
              `You have ${newCount} new message${newCount > 1 ? 's' : ''} from ${senderName}`,
            )
          }
          
          return newCount
        })
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [enabled, isAdmin, customerId, getLastSeen, notificationPermission, showNotification, isViewingChat])

  // Initialize notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
      
      // Request permission if not already asked
      if (Notification.permission === 'default') {
        // Request after a short delay to avoid blocking the UI
        setTimeout(() => {
          requestNotificationPermission()
        }, 2000)
      }
    }
  }, [requestNotificationPermission])

  // Poll for unread messages
  useEffect(() => {
    if (!enabled) return

    fetchUnreadCount()

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [enabled, fetchUnreadCount])

  return {
    unreadCount,
    notificationPermission,
    requestNotificationPermission,
    showNotification,
    updateLastSeen,
    fetchUnreadCount,
  }
}

