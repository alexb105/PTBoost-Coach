"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Shield, Users, LogOut, BookOpen, Dumbbell, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/admin", icon: Users, label: "Customers" },
  { href: "/admin/templates", icon: BookOpen, label: "Templates" },
  { href: "/admin/exercises", icon: Dumbbell, label: "Exercises" },
  { href: "/admin/branding", icon: Palette, label: "Branding" },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin/logout", { method: "POST" })
      router.push("/auth/admin")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            // For exact matches or paths that start with the href followed by /
            // Special case: /admin should only match exactly, not /admin/...
            let isActive = false
            if (item.href === "/admin") {
              // Only match exactly /admin, not /admin/...
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
                  "relative flex items-center gap-2 px-4 py-4 transition-all duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                )}
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
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
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}

