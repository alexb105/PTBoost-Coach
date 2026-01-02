"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Plus, UserPlus, Mail, Phone, User, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"

interface Customer {
  id: string
  email: string
  full_name?: string
  phone?: string
  created_at?: string
  updated_at?: string
  one_time_password_used?: boolean
}

export default function AdminPortalPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    email: "",
    full_name: "",
    phone: "",
  })
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  // Check admin session
  useEffect(() => {
    checkAdminSession()
    fetchCustomers()
  }, [])

  const checkAdminSession = async () => {
    try {
      const response = await fetch("/api/auth/admin/check")
      if (!response.ok) {
        router.push("/auth/trainer")
      }
    } catch (error) {
      router.push("/auth/trainer")
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/customers")
      
      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }

      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCustomer),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add customer")
      }

      // Store the generated password and show it
      setGeneratedPassword(data.oneTimePassword)
      setShowPasswordDialog(true)
      setIsDialogOpen(false)
      setNewCustomer({ email: "", full_name: "", phone: "" })
      fetchCustomers()
      toast.success("Customer added successfully")
    } catch (error: any) {
      console.error("Error adding customer:", error)
      toast.error(error.message || "Failed to add customer")
    }
  }

  const copyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword)
      setPasswordCopied(true)
      toast.success("Password copied to clipboard")
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false)
    setGeneratedPassword(null)
    setPasswordCopied(false)
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
                <h1 className="text-xl font-semibold">{t("admin.adminPortal")}</h1>
                <p className="text-xs text-muted-foreground">{t("admin.customerManagement")}</p>
              </div>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{t("admin.customers")}</h2>
            <p className="text-sm text-muted-foreground">{t("admin.manageTrainingClients")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                {t("admin.addCustomer")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.addNewCustomer")}</DialogTitle>
                <DialogDescription>{t("admin.createNewCustomer")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t("profile.fullName")}</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("profile.phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>{t("admin.oneTimePassword")}</AlertTitle>
                  <AlertDescription>
                    {t("admin.securePasswordNote")}
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit">{t("admin.addCustomer")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t("admin.loadingCustomers")}</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{t("admin.noCustomersYet")}</p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("admin.addFirstCustomer")}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("profile.fullName")}</TableHead>
                    <TableHead>{t("auth.email")}</TableHead>
                    <TableHead>{t("profile.phone")}</TableHead>
                    <TableHead>{t("admin.joined")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/trainer/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">
                        {customer.full_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.one_time_password_used ? (
                          customer.updated_at
                            ? `Joined ${new Date(customer.updated_at).toLocaleDateString()}`
                            : customer.created_at
                            ? `Joined ${new Date(customer.created_at).toLocaleDateString()}`
                            : "Joined"
                        ) : (
                          <span className="text-amber-500 font-medium">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* One-Time Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={handleClosePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Created Successfully</DialogTitle>
            <DialogDescription>
              A one-time password has been generated for this customer. Share this password securely with them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>One-Time Password</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex items-center justify-between gap-4">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-lg font-mono font-semibold tracking-wider">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    className="shrink-0"
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> This password can only be used once. 
                The customer should change their password after their first login.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClosePasswordDialog}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

