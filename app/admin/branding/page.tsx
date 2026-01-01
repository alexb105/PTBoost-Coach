"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Loader2, Upload, Image as ImageIcon, Palette, User } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"

interface BrandingSettings {
  brand_name: string
  tagline: string
  logo_url: string | null
  secondary_color: string
  admin_profile_picture_url: string | null
}

export default function BrandingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<BrandingSettings>({
    brand_name: "APEX Training",
    tagline: "Elite Personal Training Platform",
    logo_url: null,
    secondary_color: "#3b82f6",
    admin_profile_picture_url: null,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)

  useEffect(() => {
    checkAdminSession()
    fetchBrandingSettings()
  }, [])

  const checkAdminSession = async () => {
    try {
      const response = await fetch("/api/auth/admin/check")
      if (!response.ok) {
        router.push("/auth/admin")
      }
    } catch (error) {
      router.push("/auth/admin")
    }
  }

  const fetchBrandingSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/branding")
      
      if (!response.ok) {
        throw new Error("Failed to fetch branding settings")
      }

      const data = await response.json()
      setSettings(data)
      if (data.logo_url) {
        setLogoPreview(data.logo_url)
      }
      if (data.admin_profile_picture_url) {
        setProfilePicturePreview(data.admin_profile_picture_url)
      }
    } catch (error) {
      console.error("Error fetching branding settings:", error)
      toast.error("Failed to load branding settings")
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB")
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File | null, currentUrl: string | null): Promise<string | null> => {
    if (!file) {
      return currentUrl || null
    }

    try {
      // In a real app, you would upload to Supabase Storage or another service
      // For now, we'll use a data URL (base64) stored in the database
      // This is not ideal for production but works for MVP
      const reader = new FileReader()
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image")
      return currentUrl || null
    }
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB")
        return
      }

      setProfilePictureFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Upload logo if a new one was selected
      let logoUrl = settings.logo_url
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile, settings.logo_url)
        logoUrl = uploadedUrl
      }

      // Upload profile picture if a new one was selected
      let profilePictureUrl = settings.admin_profile_picture_url
      if (profilePictureFile) {
        const uploadedUrl = await uploadImage(profilePictureFile, settings.admin_profile_picture_url)
        profilePictureUrl = uploadedUrl
      }

      const response = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_name: settings.brand_name,
          tagline: settings.tagline,
          logo_url: logoUrl,
          secondary_color: settings.secondary_color,
          admin_profile_picture_url: profilePictureUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update branding settings")
      }

      toast.success("Branding settings updated successfully")
      setLogoFile(null)
      setProfilePictureFile(null)
      fetchBrandingSettings()
    } catch (error: any) {
      console.error("Error updating branding settings:", error)
      toast.error(error.message || "Failed to update branding settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Branding Settings</h1>
                <p className="text-xs text-muted-foreground">Configure your brand appearance</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin")}
              >
                Back to Dashboard
              </Button>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Configuration
            </CardTitle>
            <CardDescription>
              Customize your brand name, logo, and colors that appear on the client login screen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  type="text"
                  placeholder="APEX Training"
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This appears as the main title on the login page
                </p>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  type="text"
                  placeholder="Elite Personal Training Platform"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional subtitle that appears below the brand name
                </p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 w-20 rounded-lg object-contain border border-border"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Label htmlFor="logo" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("logo")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: Square image, max 5MB (PNG, JPG, SVG)
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Profile Picture Upload */}
              <div className="space-y-2">
                <Label>Admin Profile Picture</Label>
                <p className="text-xs text-muted-foreground">
                  This picture appears next to your messages in client chat conversations
                </p>
                <div className="flex items-center gap-4">
                  {profilePicturePreview ? (
                    <div className="relative">
                      <img
                        src={profilePicturePreview}
                        alt="Profile picture preview"
                        className="h-20 w-20 rounded-full object-cover border border-border"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-full border border-dashed border-border flex items-center justify-center bg-muted/50">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                    <Label htmlFor="profile-picture" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("profile-picture")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {profilePicturePreview ? "Change Profile Picture" : "Upload Profile Picture"}
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: Square image, max 5MB (PNG, JPG). This will appear in chat messages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="h-12 w-24 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    placeholder="#3b82f6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This color is used for buttons, links, and accents throughout the app
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      {logoPreview ? (
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="h-12 w-12 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                          <ImageIcon className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <h2 className="text-2xl font-semibold">{settings.brand_name}</h2>
                      {settings.tagline && (
                        <p className="text-sm text-muted-foreground">{settings.tagline}</p>
                      )}
                      <Button
                        type="button"
                        style={{ backgroundColor: settings.secondary_color }}
                        className="mt-4"
                      >
                        Sign In
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

