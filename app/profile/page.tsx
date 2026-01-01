"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ClientHeader } from "@/components/client-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, User } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string
  email: string
  full_name?: string
  phone?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const activeTab = searchParams.get("tab") || "details"

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    phone: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
    current: false,
  })

  useEffect(() => {
    fetchCustomerInfo()
  }, [])

  const fetchCustomerInfo = async () => {
    try {
      const response = await fetch("/api/customer/info")
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        setCustomerForm({
          full_name: data.customer?.full_name || "",
          phone: data.customer?.phone || "",
        })
      }
    } catch (error) {
      console.error("Error fetching customer info:", error)
      toast.error("Failed to load profile information")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/customer/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      toast.success("Profile updated successfully")
      fetchCustomerInfo()
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/customer/update-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update password")
      }

      toast.success("Password updated successfully")
      setPasswordForm({ newPassword: "", confirmPassword: "", currentPassword: "" })
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen pb-20">
      <ClientHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your account information and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Profile Details</TabsTrigger>
                <TabsTrigger value="password">Change Password</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-6">
                <form onSubmit={handleUpdateDetails} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customer?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("profile.emailCannotChange")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t("profile.fullName")}</Label>
                    <Input
                      id="full_name"
                      value={customerForm.full_name}
                      onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                      placeholder={t("profile.fullName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      placeholder={t("profile.phone")}
                    />
                  </div>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="password" className="space-y-4 mt-6">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("profile.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.updatePassword")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("profile.confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        {t("profile.updatePassword")}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

