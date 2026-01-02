"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, User, Sparkles, Settings, Lock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"

interface Customer {
  id: string
  email: string
  full_name?: string
  phone?: string
  created_at?: string
}

export function ClientHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  // Don't show header on auth, trainer, or platform admin pages
  if (pathname?.startsWith("/trainer") || pathname?.startsWith("/auth") || pathname?.startsWith("/platform-admin")) {
    return null
  }

  useEffect(() => {
    fetchCustomerInfo()
  }, [])

  const fetchCustomerInfo = async () => {
    try {
      const response = await fetch("/api/customer/info")
      if (response.status === 401) {
        // User is not authenticated, redirect to login
        router.push("/auth/login")
        return
      }
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error("Error fetching customer info:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to logout")
      }

      toast.success("Logged out successfully")
      router.push("/auth/login")
    } catch (error: any) {
      console.error("Error logging out:", error)
      toast.error("Failed to logout")
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t("auth.goodMorning")
    if (hour < 18) return t("auth.goodAfternoon")
    return t("auth.goodEvening")
  }

  const getFirstName = () => {
    if (!customer?.full_name) return "there"
    return customer.full_name.split(" ")[0]
  }

  if (loading) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl safe-area-top">
      <div className="mx-auto max-w-2xl px-3 sm:px-4 py-3 sm:py-4 pt-safe">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
                <span className="hidden sm:inline">{getGreeting()}, </span>
                {getFirstName()}! 👋
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {customer?.email || ""}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <LanguageSelector />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {customer?.full_name && (
                <div className="px-2 py-1.5 text-sm font-medium">
                  {customer.full_name}
                </div>
              )}
              {customer?.email && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  {customer.email}
                </div>
              )}
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                {t("profile.editProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile?tab=password")}>
                <Lock className="mr-2 h-4 w-4" />
                {t("profile.changePassword")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

