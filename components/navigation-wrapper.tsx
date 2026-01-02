"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { AdminNav } from "@/components/admin-nav"

export function NavigationWrapper() {
  const pathname = usePathname()

  // Show admin nav on trainer pages
  if (pathname?.startsWith("/trainer")) {
    return <AdminNav />
  }

  // Don't show nav on platform admin or auth pages
  if (pathname?.startsWith("/platform-admin") || pathname?.startsWith("/auth")) {
    return null
  }

  // Show client nav on client pages
  return <BottomNav />

  // No nav on auth pages
  return null
}

