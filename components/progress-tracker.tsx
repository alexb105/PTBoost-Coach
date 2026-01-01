"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Camera, Plus, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/language-context"

interface WeightEntry {
  id: string
  date: string
  weight: number
  notes?: string
}

interface ProgressPhoto {
  id: string
  date: string
  url: string
  type?: string
}

export function ProgressTracker() {
  const { t } = useLanguage()
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [weightDialogOpen, setWeightDialogOpen] = useState(false)
  const [weightForm, setWeightForm] = useState({
    weight: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/progress')
      if (response.ok) {
        const data = await response.json()
        setWeightEntries(data.weightEntries || [])
        setProgressPhotos(data.progressPhotos || [])
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [])

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightForm.weight || !weightForm.date) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/customer/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: weightForm.weight,
          date: weightForm.date,
          notes: weightForm.notes || null,
        }),
      })

      if (response.ok) {
        setWeightDialogOpen(false)
        setWeightForm({
          weight: "",
          date: new Date().toISOString().split('T')[0],
          notes: ""
        })
        fetchProgress()
      } else {
        const error = await response.json()
        console.error('Error saving weight:', error)
        alert(error.error || 'Failed to save weight entry')
      }
    } catch (error) {
      console.error('Error saving weight:', error)
      alert('Failed to save weight entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("progress.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("progress.title")}</p>
      </div>

      {/* Weight Tracking Section */}
      <Card className="mb-6 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("progress.weight")}</h2>
              <p className="text-sm text-muted-foreground">{t("progress.trackWeight")}</p>
            </div>
          </div>
          <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1 h-4 w-4" />
                {t("common.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>{t("progress.logWeight")}</DialogTitle>
                <DialogDescription>{t("progress.enterCurrentWeight")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveWeight} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{t("progress.weightLbs")}</Label>
                  <Input 
                    id="weight" 
                    type="number" 
                    step="0.1"
                    placeholder="180" 
                    className="bg-background" 
                    value={weightForm.weight}
                    onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t("workouts.date")}</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    className="bg-background" 
                    value={weightForm.date}
                    onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("workouts.notes")}</Label>
                  <Input 
                    id="notes" 
                    type="text" 
                    placeholder="e.g., Morning weigh-in" 
                    className="bg-background" 
                    value={weightForm.notes}
                    onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("progress.saveWeight")
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : weightEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("progress.noWeightEntries")}</p>
          ) : (
            weightEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.date), "MMM d, yyyy")}
                  </span>
                  {entry.notes && (
                    <span className="text-xs text-muted-foreground mt-1">{entry.notes}</span>
                  )}
                </div>
                <span className="font-semibold text-foreground">{entry.weight} {t("progress.weightUnit")}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Progress Photos Section */}
      <Card className="bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("progress.progressPhotos")}</h2>
              <p className="text-sm text-muted-foreground">{t("progress.visualJourney")}</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1 h-4 w-4" />
                {t("common.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>{t("progress.addProgressPhoto")}</DialogTitle>
                <DialogDescription>{t("progress.uploadPhotoDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="photo">{t("progress.photo")}</Label>
                  <Input id="photo" type="file" accept="image/*" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo-date">{t("workouts.date")}</Label>
                  <Input id="photo-date" type="date" className="bg-background" />
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{t("progress.uploadPhoto")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : progressPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 col-span-2">{t("progress.noPhotos")}</p>
          ) : (
            progressPhotos.map((photo) => (
              <div key={photo.id} className="space-y-2">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-background">
                  <img
                    src={photo.url || "/placeholder.svg"}
                    alt={`Progress photo from ${format(new Date(photo.date), "MMM d, yyyy")}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {format(new Date(photo.date), "MMM d, yyyy")}
                  {photo.type && ` (${photo.type})`}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
