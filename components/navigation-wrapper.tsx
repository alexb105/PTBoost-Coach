"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { AdminNav } from "@/components/admin-nav"

export function NavigationWrapper() {
  const pathname = usePathname()

  // Show admin nav on admin pages
  if (pathname?.startsWith("/admin")) {
    return <AdminNav />
  }

  // Show client nav on client pages (not on auth pages)
  if (!pathname?.startsWith("/auth")) {
    return <BottomNav />
  }

  // No nav on auth pages
  return null
}

