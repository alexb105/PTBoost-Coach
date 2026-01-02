"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Users, LogOut, BookOpen, Dumbbell, Palette, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/trainer", icon: Users, label: "Customers" },
  { href: "/trainer/templates", icon: BookOpen, label: "Workouts" },
  { href: "/trainer/exercises", icon: Dumbbell, label: "Exercises" },
  { href: "/trainer/branding", icon: Palette, label: "Branding" },
  { href: "/trainer/settings", icon: Settings, label: "Settings" },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  
  // Use trainer routes only
  const mappedNavItems = navItems

  const handleLogout = async () => {
    try {
      // Try to logout from both trainer and legacy admin sessions
      await Promise.all([
        fetch("/api/auth/trainer/logout", { method: "POST" }).catch(() => {}),
        fetch("/api/auth/admin/logout", { method: "POST" }).catch(() => {}),
      ])
      router.push("/auth/trainer")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/trainer")
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {mappedNavItems.map((item) => {
            // For exact matches or paths that start with the href followed by /
            // Special case: /trainer should only match exactly, not /trainer/...
            let isActive = false
            if (item.href === "/trainer") {
              // Only match exactly /trainer, not /trainer/...
              isActive = pathname === item.href
            } else {
              // For other routes, match exactly or paths starting with href + /
              isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            }
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-4 transition-all duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                )}
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span className="hidden sm:inline text-sm font-medium tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
