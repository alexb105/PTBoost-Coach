"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, ArrowLeft, Loader2, Check, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    // Get email from URL params if available
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !code) {
      toast.error("Please enter your email and verification code")
      return
    }

    if (code.length !== 6) {
      toast.error("Verification code must be 6 digits")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/trainer/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }

      toast.success("Email verified successfully! Redirecting...")
      setTimeout(() => {
        router.push("/trainer")
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code")
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setResending(true)

    try {
      const response = await fetch("/api/auth/trainer/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code")
      }

      toast.success("Verification code sent! Check your email.")
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification code")
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/auth/trainer"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PT Boost</h1>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-400" />
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-slate-400">
              We&apos;ve sent a 6-digit verification code to your email. Enter it below to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-slate-300">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    // Only allow numbers and limit to 6 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(value)
                  }}
                  required
                  maxLength={6}
                  className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <Button 
                type="submit" 
                className="h-11 w-full font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 text-white"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400 text-center mb-3">
                Didn&apos;t receive the code?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={resending || !email}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already verified?{" "}
                <Link 
                  href="/auth/trainer" 
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

