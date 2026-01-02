"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Settings, 
  User, 
  Building, 
  CreditCard, 
  Users, 
  Loader2, 
  Check,
  Sparkles,
  ArrowRight,
  Crown
} from "lucide-react"
import { toast } from "sonner"
import { SUBSCRIPTION_TIERS } from "@/lib/trainer-auth"

interface TrainerInfo {
  id: string | null
  email: string
  fullName: string | null
  businessName: string | null
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise'
  subscriptionStatus: string
  maxClients: number
  clientCount: number
  isLegacyAdmin: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
  })

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
      setFormData({
        fullName: data.trainer.fullName || "",
        businessName: data.trainer.businessName || "",
      })
    } catch (error) {
      console.error("Error fetching trainer info:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!trainer?.id) {
      toast.error("Cannot update profile for legacy admin")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/auth/trainer/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      toast.success("Profile updated successfully")
      fetchTrainerInfo()
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!trainer) {
    return null
  }

  const clientUsagePercent = (trainer.clientCount / trainer.maxClients) * 100
  const tierInfo = SUBSCRIPTION_TIERS[trainer.subscriptionTier]

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account and subscription
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal and business details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">First Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your first name"
                  disabled={trainer.isLegacyAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Your business name"
                  disabled={trainer.isLegacyAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={trainer.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            {!trainer.isLegacyAdmin && (
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </div>
              <Badge 
                variant={trainer.subscriptionTier === 'enterprise' ? 'default' : 'secondary'}
                className={trainer.subscriptionTier === 'enterprise' ? 'bg-gradient-to-r from-amber-500 to-orange-600' : ''}
              >
                {trainer.subscriptionTier === 'enterprise' && <Crown className="h-3 w-3 mr-1" />}
                {tierInfo.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Client Usage
                </span>
                <span className="font-medium">
                  {trainer.clientCount} / {trainer.maxClients === 9999 ? '∞' : trainer.maxClients}
                </span>
              </div>
              <Progress value={Math.min(clientUsagePercent, 100)} className="h-2" />
              {clientUsagePercent >= 80 && trainer.subscriptionTier !== 'enterprise' && (
                <p className="text-xs text-amber-500">
                  You&apos;re approaching your client limit. Consider upgrading.
                </p>
              )}
            </div>

            {/* Current Plan Features */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-medium">Your Plan Includes:</h4>
              <ul className="space-y-2">
                {tierInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade CTA */}
            {trainer.subscriptionTier !== 'enterprise' && !trainer.isLegacyAdmin && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Upgrade Your Plan
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get more clients and premium features
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {trainer.isLegacyAdmin && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  You&apos;re using the legacy admin account. Create a trainer account to access subscription features.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {!trainer.isLegacyAdmin && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <h4 className="font-medium">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

