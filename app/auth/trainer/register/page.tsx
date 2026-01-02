"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, ArrowLeft, Loader2, Check, Users, Calendar, MessageSquare, TrendingUp, Zap, Shield, Clock, Sparkles } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const FEATURES = [
  { icon: Zap, text: "Get started instantly - no credit card required" },
  { icon: Users, text: "Build and scale your client base effortlessly" },
  { icon: Calendar, text: "Create unlimited custom workout plans" },
  { icon: MessageSquare, text: "Stay connected with in-app messaging" },
  { icon: TrendingUp, text: "Track progress with detailed analytics" },
  { icon: Shield, text: "Enterprise-grade security & data protection" },
]

export default function TrainerRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    businessName: "",
  })
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/trainer/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          businessName: formData.businessName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      toast.success("Account created! Please check your email for verification code.")
      router.push(`/auth/trainer/verify?email=${encodeURIComponent(formData.email)}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTIgMGgyLTJ2Mmgtdi0yem0wIDBoMnYtMmgtMnYyem0xMiAwdi0ySDI0djJoMTJ6bTAtNHYtMkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-8 xl:px-12 py-8">
        <div className="max-w-lg">
          <div className="mb-6">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white mb-2 leading-tight">
              Scale Your <span className="text-emerald-400">Personal Training</span> Business
            </h1>
            <p className="text-base xl:text-lg text-slate-400 mb-2 leading-relaxed">
              The all-in-one platform trusted by thousands of trainers to grow their business, engage clients, and deliver results.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs xl:text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Start free • Upgrade anytime • Cancel anytime</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-2.5 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0 mt-0.5">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-slate-300 leading-snug">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 mb-5">
            <div className="flex items-start gap-2 mb-2.5">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Sparkles key={i} className="h-2.5 w-2.5 text-emerald-400 fill-emerald-400" />
                ))}
              </div>
            </div>
            <p className="text-slate-200 italic text-sm leading-relaxed mb-3">
              &ldquo;PT Boost has transformed how I manage my clients. I&apos;ve grown from 5 to 25 clients in just 3 months while saving 10+ hours per week on admin tasks!&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                JD
              </div>
              <div>
                <p className="text-white font-medium text-sm">James Davis</p>
                <p className="text-xs text-slate-400">Personal Trainer, London</p>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl xl:text-2xl font-bold text-emerald-400">10K+</div>
              <div className="text-xs text-slate-400 mt-0.5">Active Trainers</div>
            </div>
            <div className="text-center">
              <div className="text-xl xl:text-2xl font-bold text-emerald-400">50K+</div>
              <div className="text-xs text-slate-400 mt-0.5">Clients Managed</div>
            </div>
            <div className="text-center">
              <div className="text-xl xl:text-2xl font-bold text-emerald-400">4.9★</div>
              <div className="text-xs text-slate-400 mt-0.5">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:px-8 xl:px-12 lg:py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">PT Boost</h1>
          </div>

          {/* Back Button */}
          <Link
            href="/auth/trainer"
            className="mb-4 lg:mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          <Card className="border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-xl xl:text-2xl font-bold tracking-tight text-white">Start Your Free Account</CardTitle>
              <CardDescription className="text-sm text-slate-400">
                Join thousands of trainers. No credit card required. Upgrade when you&apos;re ready to scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-medium text-slate-300">
                      First Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName" className="text-xs font-medium text-slate-300">
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="JS Fitness"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="h-10 w-full font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 text-white text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Create Free Account
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-emerald-400 hover:text-emerald-300">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-emerald-400 hover:text-emerald-300">Privacy Policy</a>
                </p>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-slate-400">
                  Already have an account?{" "}
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

          {/* Trust Badges */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

