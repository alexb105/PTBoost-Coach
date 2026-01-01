"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

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
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-balance">APEX Training</h1>
          <p className="text-sm text-muted-foreground">Elite Personal Training Platform</p>
        </div>

        <Card className="border-border/50 bg-card/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to continue your fitness journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
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
                    Password
                  </Label>
                  <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
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
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <button className="text-primary hover:text-primary/80 transition-colors font-medium">
                    Contact your trainer
                  </button>
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Admin Access</span>
                </div>
              </div>

              <Link href="/auth/admin" className="block">
                <Button variant="outline" className="h-10 w-full text-sm bg-transparent">
                  Admin Portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">Protected by enterprise-grade security</p>
      </div>
    </main>
  )
}
