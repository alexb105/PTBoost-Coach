"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  Crown, 
  Loader2,
  ArrowLeft,
  Sparkles,
  Users,
  Dumbbell,
  Zap
} from "lucide-react"
import { toast } from "sonner"
import { SUBSCRIPTION_TIERS } from "@/lib/trainer-auth"

interface TrainerInfo {
  id: string | null
  email: string
  fullName: string | null
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise'
  subscriptionStatus: string
  maxClients: number
  maxExercises: number
  clientCount: number
  exerciseCount: number
  isLegacyAdmin: boolean
}

const tierOrder: Array<'free' | 'basic' | 'pro' | 'enterprise'> = ['free', 'basic', 'pro', 'enterprise']

const tierColors = {
  free: 'bg-gray-500',
  basic: 'bg-blue-500',
  pro: 'bg-purple-500',
  enterprise: 'bg-gradient-to-r from-amber-500 to-orange-600',
}

const tierIcons = {
  free: Users,
  basic: Zap,
  pro: Sparkles,
  enterprise: Crown,
}

export default function PlansPage() {
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    fetchTrainerInfo()
  }, [])

  const fetchTrainerInfo = async () => {
    try {
      const response = await fetch("/api/auth/trainer/me")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/trainer")
          return
        }
        throw new Error("Failed to fetch trainer info")
      }
      const data = await response.json()
      setTrainer(data.trainer)
    } catch (error) {
      console.error("Error fetching trainer info:", error)
      toast.error("Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
    if (!trainer || trainer.isLegacyAdmin) {
      toast.error("Cannot upgrade legacy admin account")
      return
    }

    if (tier === trainer.subscriptionTier) {
      toast.info("You are already on this plan")
      return
    }

    // Check if downgrading
    const currentTierIndex = tierOrder.indexOf(trainer.subscriptionTier)
    const newTierIndex = tierOrder.indexOf(tier)
    
    if (newTierIndex < currentTierIndex) {
      // For downgrades, redirect to customer portal
      toast.info("To downgrade your plan, please use the subscription management portal in Settings.")
      router.push("/trainer/settings")
      return
    }

    // Free tier doesn't need payment
    if (tier === 'free') {
      toast.info("You are already on a paid plan. To downgrade to free, please cancel your subscription in Settings.")
      return
    }

    setUpgrading(tier)
    try {
      const response = await fetch("/api/trainer/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error: any) {
      console.error("Error upgrading plan:", error)
      toast.error(error.message || "Failed to upgrade plan")
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!trainer) {
    return null
  }

  const isCurrentTier = (tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
    return trainer.subscriptionTier === tier
  }

  const canUpgrade = (tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
    if (trainer.isLegacyAdmin) return false
    const currentIndex = tierOrder.indexOf(trainer.subscriptionTier)
    const targetIndex = tierOrder.indexOf(tier)
    return targetIndex > currentIndex
  }

  const canDowngrade = (tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
    if (trainer.isLegacyAdmin) return false
    const currentIndex = tierOrder.indexOf(trainer.subscriptionTier)
    const targetIndex = tierOrder.indexOf(tier)
    return targetIndex < currentIndex
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/trainer/settings")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground text-lg">
              Select the perfect plan for your training business
            </p>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {tierOrder.map((tier) => {
            const tierInfo = SUBSCRIPTION_TIERS[tier]
            const Icon = tierIcons[tier]
            const isCurrent = isCurrentTier(tier)
            const canUpgradeTo = canUpgrade(tier)
            const canDowngradeTo = canDowngrade(tier)

            return (
              <Card
                key={tier}
                className={`relative overflow-hidden ${
                  isCurrent
                    ? 'ring-2 ring-primary shadow-lg scale-105'
                    : 'hover:shadow-lg transition-all'
                } ${
                  tier === 'pro' ? 'border-purple-500/50' : ''
                } ${
                  tier === 'enterprise' ? 'border-amber-500/50' : ''
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    Current Plan
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    tier === 'free' ? 'bg-gray-500/20' :
                    tier === 'basic' ? 'bg-blue-500/20' :
                    tier === 'pro' ? 'bg-purple-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      tier === 'free' ? 'text-gray-500' :
                      tier === 'basic' ? 'text-blue-500' :
                      tier === 'pro' ? 'text-purple-500' :
                      'text-amber-500'
                    }`} />
                  </div>
                  <CardTitle className="text-2xl">{tierInfo.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${tierInfo.price}
                    </span>
                    {tierInfo.price > 0 && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                      Features
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>
                          {tierInfo.maxClients === 9999 
                            ? 'Unlimited clients' 
                            : `Up to ${tierInfo.maxClients} clients`}
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Dumbbell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>
                          {tierInfo.maxExercises === 9999 
                            ? 'Unlimited custom exercises' 
                            : tierInfo.maxExercises === 0
                            ? 'No custom exercises'
                            : `Up to ${tierInfo.maxExercises} custom exercises`}
                        </span>
                      </li>
                      {tierInfo.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <Button
                    className={`w-full ${
                      isCurrent
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : canUpgradeTo
                        ? `bg-gradient-to-r ${
                            tier === 'basic' ? 'from-blue-500 to-blue-600' :
                            tier === 'pro' ? 'from-purple-500 to-purple-600' :
                            'from-amber-500 to-orange-600'
                          } hover:opacity-90`
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrent || upgrading === tier || trainer.isLegacyAdmin}
                  >
                    {upgrading === tier ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : canUpgradeTo ? (
                      "Upgrade"
                    ) : canDowngradeTo ? (
                      "Downgrade"
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Need Help Choosing?</h3>
                <p className="text-muted-foreground">
                  All plans include full access to workout management, client tracking, messaging, and progress monitoring.
                  Upgrade anytime to unlock more clients and custom exercises.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">24/7</div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">Cancel</div>
                    <div className="text-sm text-muted-foreground">Anytime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">No</div>
                    <div className="text-sm text-muted-foreground">Setup Fees</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

