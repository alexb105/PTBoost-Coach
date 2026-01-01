"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, TrendingUp, MessageCircle, Apple } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMessageNotifications } from "@/hooks/use-message-notifications"
import { useLanguage } from "@/contexts/language-context"

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { unreadCount, updateLastSeen, fetchUnreadCount } = useMessageNotifications({ enabled: !pathname?.startsWith("/admin") && !pathname?.startsWith("/auth") })

  const navItems = [
    { href: "/", icon: Calendar, label: t("navigation.sessions") },
    { href: "/progress", icon: TrendingUp, label: t("navigation.progress") },
    { href: "/chat", icon: MessageCircle, label: t("navigation.chat") },
    { href: "/nutrition", icon: Apple, label: t("navigation.nutrition") },
  ]

  // Don't show client nav on admin or auth pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border/50 bg-card/80 backdrop-blur-xl safe-area-bottom">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          // Show badge only when there are unread messages and not on chat page
          const showBadge = item.href === "/chat" && unreadCount > 0 && !isActive
          
          const handleChatClick = (e: React.MouseEvent) => {
            if (item.href === "/chat") {
              // Clear the badge by marking all messages as seen
              updateLastSeen(new Date().toISOString())
              fetchUnreadCount()
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleChatClick}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1.5 py-3 transition-all duration-300 min-h-[44px] min-w-[44px] touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <div className="absolute top-0 h-0.5 w-12 rounded-full bg-primary shadow-sm shadow-primary/50" />
              )}
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
