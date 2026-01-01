"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dumbbell, Loader2, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/contexts/language-context"

const REMEMBERED_CREDENTIALS_KEY = "ptboost_remembered_credentials"

interface BrandingSettings {
  brand_name: string
  tagline: string
  logo_url: string | null
  secondary_color: string
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState<BrandingSettings>({
    brand_name: "APEX Training",
    tagline: "Elite Personal Training Platform",
    logo_url: null,
    secondary_color: "#3b82f6",
  })

  // Load branding settings and remembered credentials on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch("/api/branding")
        if (response.ok) {
          const data = await response.json()
          setBranding(data)
          
          // Apply secondary color as CSS variable
          if (typeof document !== "undefined" && data.secondary_color) {
            document.documentElement.style.setProperty("--secondary", data.secondary_color)
            // Also update primary if needed for consistency
            document.documentElement.style.setProperty("--primary", data.secondary_color)
          }
        }
      } catch (error) {
        console.error("Failed to load branding settings:", error)
      }
    }

    loadBranding()

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(REMEMBERED_CREDENTIALS_KEY)
        if (saved) {
          const credentials = JSON.parse(saved)
          setEmail(credentials.email || "")
          setPassword(credentials.password || "")
          setRememberMe(true)
        }
      } catch (error) {
        console.error("Failed to load remembered credentials:", error)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      // Save or clear credentials based on "Remember Me" checkbox
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem(
            REMEMBERED_CREDENTIALS_KEY,
            JSON.stringify({ email, password })
          )
        } else {
          localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY)
        }
      }

      // Check if user needs to update password
      if (data.needsPasswordUpdate) {
        toast.info("Please update your password to continue")
        router.push("/auth/update-password")
      } else {
        toast.success("Login successful! Redirecting...")
        router.push("/")
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="w-full max-w-md">
        {/* Language Selector */}
        <div className="mb-4 flex justify-end">
          <LanguageSelector />
        </div>
        
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.brand_name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <Dumbbell className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-balance">{branding.brand_name}</h1>
          {branding.tagline && (
            <p className="text-sm text-muted-foreground">{branding.tagline}</p>
          )}
        </div>

        <Card className="border-border/50 bg-card/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">{t("auth.welcome")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("auth.signInToContinue")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t("auth.password")}
                  </Label>
                  <button 
                    type="button" 
                    className="text-xs transition-colors"
                    style={{ color: branding.secondary_color }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1"
                    }}
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("auth.rememberMe")}
                </Label>
              </div>
              <Button 
                type="submit" 
                className="h-11 w-full font-medium shadow-lg shadow-primary/20"
                style={{ backgroundColor: branding.secondary_color }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.signingIn")}
                  </>
                ) : (
                  t("auth.loginButton")
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {t("auth.noAccount")}{" "}
                  <button 
                    className="transition-colors font-medium"
                    style={{ color: branding.secondary_color }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.8"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1"
                    }}
                  >
                    {t("auth.contactTrainer")}
                  </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("auth.securityMessage")}</p>
      </div>
    </main>
  )
}
