"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Users, LogOut, Loader2, Crown, TrendingUp, Key, AlertCircle, Lock, Trash2, CreditCard, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Trainer {
  id: string
  email: string
  full_name: string | null
  business_name: string | null
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'cancelled' | 'expired' | 'trial'
  max_clients: number
  clientCount: number
  created_at: string
  auth_user_id: string | null
  stripe_customer_id: string | null
}

export default function PlatformAdminPage() {
  const router = useRouter()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [linkingTrainer, setLinkingTrainer] = useState<string | null>(null)
  const [linkPassword, setLinkPassword] = useState("")
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [resettingTrainer, setResettingTrainer] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [deletingTrainer, setDeletingTrainer] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      // First check session
      const sessionResponse = await fetch("/api/auth/admin/check")
      if (!sessionResponse.ok || sessionResponse.status === 401) {
        router.push("/auth/platform-admin")
        return
      }
      
      // If session is valid, fetch trainers
      await fetchTrainers()
    }
    
    initialize()
  }, [])

  const fetchTrainers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/platform-admin/trainers")
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/platform-admin")
          return
        }
        throw new Error("Failed to fetch trainers")
      }

      const data = await response.json()
      setTrainers(data.trainers || [])
    } catch (error) {
      console.error("Error fetching trainers:", error)
      toast.error("Failed to load trainers")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSubscription = async (trainerId: string, tier: string) => {
    try {
      const response = await fetch(`/api/platform-admin/trainers/${trainerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_tier: tier }),
      })

      if (!response.ok) {
        throw new Error("Failed to update subscription")
      }

      toast.success("Subscription updated successfully")
      fetchTrainers()
    } catch (error) {
      toast.error("Failed to update subscription")
    }
  }

  const handleLinkAuth = async (trainerId: string) => {
    if (!linkPassword || linkPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    try {
      const response = await fetch(`/api/platform-admin/trainers/${trainerId}/link-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: linkPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to link auth user")
      }

      toast.success("Auth user created and linked successfully")
      setIsLinkDialogOpen(false)
      setLinkPassword("")
      setLinkingTrainer(null)
      fetchTrainers()
    } catch (error: any) {
      toast.error(error.message || "Failed to link auth user")
    }
  }

  const handleResetPassword = async (trainerId: string) => {
    if (!resetPassword || resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    try {
      const response = await fetch(`/api/platform-admin/trainers/${trainerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reset password")
      }

      toast.success("Password reset successfully")
      setIsResetDialogOpen(false)
      setResetPassword("")
      setResettingTrainer(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password")
    }
  }

  const handleDeleteTrainer = async (trainerId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/trainers/${trainerId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete trainer")
      }

      toast.success("Trainer deleted successfully")
      setIsDeleteDialogOpen(false)
      setDeletingTrainer(null)
      fetchTrainers()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete trainer")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin/logout", { method: "POST" })
      router.push("/auth/platform-admin")
    } catch (error) {
      router.push("/auth/platform-admin")
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-gradient-to-r from-amber-500 to-orange-600'
      case 'pro': return 'bg-purple-500'
      case 'basic': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const totalTrainers = trainers.length
  const activeTrainers = trainers.filter(t => t.subscription_status === 'active').length
  const totalClients = trainers.reduce((sum, t) => sum + t.clientCount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/5">
                <Settings className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Platform Administration</h1>
                <p className="text-xs text-muted-foreground">Manage trainers and subscriptions</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trainers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTrainers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTrainers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
            </CardContent>
          </Card>
        </div>

        {/* Trainers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Trainers</CardTitle>
            <CardDescription>Manage trainer accounts and subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Auth Status</TableHead>
                    <TableHead>Stripe</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Max Clients</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell className="font-medium">
                        {trainer.full_name || trainer.business_name || 'N/A'}
                      </TableCell>
                      <TableCell>{trainer.email}</TableCell>
                      <TableCell>
                        {trainer.auth_user_id ? (
                          <Badge variant="default" className="bg-green-500">
                            <Key className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No Auth
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {trainer.stripe_customer_id ? (
                          <a
                            href={`https://dashboard.stripe.com/customers/${trainer.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                          >
                            <CreditCard className="h-3 w-3" />
                            {trainer.stripe_customer_id.slice(0, 14)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(trainer.subscription_tier)}>
                          {trainer.subscription_tier === 'enterprise' && <Crown className="h-3 w-3 mr-1" />}
                          {trainer.subscription_tier.charAt(0).toUpperCase() + trainer.subscription_tier.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trainer.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {trainer.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{trainer.clientCount}</TableCell>
                      <TableCell>{trainer.max_clients === 9999 ? '∞' : trainer.max_clients}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!trainer.auth_user_id && (
                            <Dialog 
                              open={isLinkDialogOpen && linkingTrainer === trainer.id}
                              onOpenChange={(open) => {
                                setIsLinkDialogOpen(open)
                                if (!open) {
                                  setLinkingTrainer(null)
                                  setLinkPassword("")
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setLinkingTrainer(trainer.id)
                                    setIsLinkDialogOpen(true)
                                  }}
                                  className="gap-1"
                                >
                                  <Key className="h-3 w-3" />
                                  Link Auth
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Create Auth Account</DialogTitle>
                                  <DialogDescription>
                                    Create a login account for {trainer.email}. They will use this password to log in.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="link-password">Password</Label>
                                    <Input
                                      id="link-password"
                                      type="password"
                                      placeholder="Minimum 8 characters"
                                      value={linkPassword}
                                      onChange={(e) => setLinkPassword(e.target.value)}
                                      minLength={8}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      This password will be used by the trainer to log in at /auth/trainer
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsLinkDialogOpen(false)
                                        setLinkingTrainer(null)
                                        setLinkPassword("")
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleLinkAuth(trainer.id)}
                                      disabled={linkPassword.length < 8}
                                    >
                                      Create & Link
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {trainer.auth_user_id && (
                            <Dialog 
                              open={isResetDialogOpen && resettingTrainer === trainer.id}
                              onOpenChange={(open) => {
                                setIsResetDialogOpen(open)
                                if (!open) {
                                  setResettingTrainer(null)
                                  setResetPassword("")
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setResettingTrainer(trainer.id)
                                    setIsResetDialogOpen(true)
                                  }}
                                  className="gap-1"
                                >
                                  <Lock className="h-3 w-3" />
                                  Reset Password
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reset Password</DialogTitle>
                                  <DialogDescription>
                                    Set a new password for {trainer.email}. The trainer will need to use this password to log in.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="reset-password">New Password</Label>
                                    <Input
                                      id="reset-password"
                                      type="password"
                                      placeholder="Minimum 8 characters"
                                      value={resetPassword}
                                      onChange={(e) => setResetPassword(e.target.value)}
                                      minLength={8}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      The trainer will need to use this new password to log in at /auth/trainer
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsResetDialogOpen(false)
                                        setResettingTrainer(null)
                                        setResetPassword("")
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleResetPassword(trainer.id)}
                                      disabled={resetPassword.length < 8}
                                    >
                                      Reset Password
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Select
                            value={trainer.subscription_tier}
                            onValueChange={(value) => handleUpdateSubscription(trainer.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeletingTrainer(trainer.id)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={isDeleteDialogOpen} 
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) {
              setDeletingTrainer(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Trainer</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingTrainer && (() => {
                  const trainerToDelete = trainers.find(t => t.id === deletingTrainer)
                  if (!trainerToDelete) return "Are you sure you want to delete this trainer?"
                  
                  return `Are you sure you want to delete ${trainerToDelete.email}? This action cannot be undone.`
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deletingTrainer && (() => {
              const trainerToDelete = trainers.find(t => t.id === deletingTrainer)
              if (!trainerToDelete) return null
              
              return (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>The trainer account</li>
                    <li>All associated clients ({trainerToDelete.clientCount} client{trainerToDelete.clientCount !== 1 ? 's' : ''})</li>
                    <li>All workouts and exercise data</li>
                    <li>All messages and progress tracking</li>
                    {trainerToDelete.auth_user_id && <li>The authentication account</li>}
                  </ul>
                </div>
              )
            })()}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingTrainer(null)
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingTrainer) {
                    handleDeleteTrainer(deletingTrainer)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Trainer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}

