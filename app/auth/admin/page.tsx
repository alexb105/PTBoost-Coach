"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/admin", {
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

      toast.success("Login successful! Redirecting...")
      router.push("/admin")
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/auth/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client Login
        </Link>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-balance">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">Elevated Access Control</p>
        </div>

        <Card className="border-border/50 bg-card/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Administrator Sign In</CardTitle>
            <CardDescription className="text-muted-foreground">
              Secure access for training professionals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Security Notice */}
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Enhanced Security Required</p>
                  <p className="text-xs text-muted-foreground">
                    Admin access requires additional authentication and is subject to audit logging
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-sm font-medium">
                  Admin Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@apextraining.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm font-medium">
                  Admin Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50"
                />
              </div>
              <Button 
                type="submit" 
                className="h-11 w-full font-medium shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                <Shield className="mr-2 h-4 w-4" />
                Admin Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <button className="text-primary hover:text-primary/80 transition-colors font-medium">
                  Contact system administrator
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">All admin activity is monitored and logged</p>
      </div>
    </main>
  )
}
