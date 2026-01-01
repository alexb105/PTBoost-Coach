"use client"

import { useState, useEffect, useRef } from "react"
import { TrendingUp, Camera, Plus, Loader2, X, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/language-context"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

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
  notes?: string
}

interface WeightGoal {
  id: string
  target_weight: number
  goal_type: "weekly" | "monthly"
  start_date: string
  end_date: string
  notes?: string
}

export function ProgressTracker() {
  const { t } = useLanguage()
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([])
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([])
  const [weightGoals, setWeightGoals] = useState<WeightGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [weightDialogOpen, setWeightDialogOpen] = useState(false)
  const [weightForm, setWeightForm] = useState({
    weight: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [photoForm, setPhotoForm] = useState({
    file: null as File | null,
    date: new Date().toISOString().split('T')[0],
    type: "",
    notes: ""
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [weightPage, setWeightPage] = useState(1)
  const [photoPage, setPhotoPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/progress')
      if (response.ok) {
        const data = await response.json()
        setWeightEntries(data.weightEntries || [])
        setProgressPhotos(data.progressPhotos || [])
        setWeightGoals(data.weightGoals || [])
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

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB')
      return
    }

    setPhotoForm({ ...photoForm, file })
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photoForm.file || !photoForm.date) {
      toast.error('Please select a photo and date')
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('file', photoForm.file)
      formData.append('date', photoForm.date)
      if (photoForm.type) {
        formData.append('type', photoForm.type)
      }
      if (photoForm.notes) {
        formData.append('notes', photoForm.notes)
      }

      const response = await fetch('/api/customer/progress/photos', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast.success('Progress photo uploaded successfully')
        setPhotoDialogOpen(false)
        setPhotoPage(1) // Reset to first page after adding new photo
        // Fetch progress after dialog closes to avoid DOM manipulation issues
        setTimeout(() => {
          fetchProgress()
        }, 200)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload photo')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    try {
      setDeletingPhotoId(photoId)
      const response = await fetch(`/api/customer/progress/photos?id=${photoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Photo deleted successfully')
        // Adjust page if current page becomes empty after deletion
        const remainingPhotos = progressPhotos.length - 1
        const maxPage = Math.ceil(remainingPhotos / ITEMS_PER_PAGE)
        if (photoPage > maxPage && maxPage > 0) {
          setPhotoPage(maxPage)
        }
        fetchProgress()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete photo')
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
    } finally {
      setDeletingPhotoId(null)
    }
  }

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
        setWeightPage(1) // Reset to first page after adding new entry
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

  // Calculate pagination for weight entries
  const weightTotalPages = Math.ceil(weightEntries.length / ITEMS_PER_PAGE)
  const weightStartIndex = (weightPage - 1) * ITEMS_PER_PAGE
  const weightEndIndex = weightStartIndex + ITEMS_PER_PAGE
  const paginatedWeightEntries = weightEntries.slice(weightStartIndex, weightEndIndex)

  // Calculate pagination for progress photos
  const photoTotalPages = Math.ceil(progressPhotos.length / ITEMS_PER_PAGE)
  const photoStartIndex = (photoPage - 1) * ITEMS_PER_PAGE
  const photoEndIndex = photoStartIndex + ITEMS_PER_PAGE
  const paginatedProgressPhotos = progressPhotos.slice(photoStartIndex, photoEndIndex)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("progress.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("progress.title")}</p>
      </div>

      {/* Weight Goals Section */}
      {weightGoals.length > 0 && (
        <Card className="mb-6 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Weight Goals</h2>
              <p className="text-sm text-muted-foreground">Your current weight goals</p>
            </div>
          </div>

          <div className="space-y-3">
            {weightGoals.map((goal) => {
              const startDate = new Date(goal.start_date)
              const endDate = new Date(goal.end_date)
              const today = new Date()
              const isActive = today >= startDate && today <= endDate
              const isPast = today > endDate
              
              // Find current weight (most recent entry within goal period)
              const currentWeightEntry = weightEntries
                .filter(e => {
                  const entryDate = new Date(e.date)
                  return entryDate >= startDate && entryDate <= endDate
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
              
              const currentWeight = currentWeightEntry?.weight || null
              const progress = currentWeight ? ((currentWeight / goal.target_weight) * 100) : 0

              return (
                <div key={goal.id} className="rounded-lg bg-background p-4 border border-border">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {goal.goal_type === "weekly" ? "Weekly" : "Monthly"} Goal
                      </span>
                      {isActive && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Active</span>
                      )}
                      {isPast && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Completed</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Target Weight</span>
                      <span className="font-semibold text-foreground">{goal.target_weight} {t("progress.weightUnit")}</span>
                    </div>
                    {currentWeight && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Weight</span>
                          <span className="font-semibold text-foreground">{currentWeight} {t("progress.weightUnit")}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </>
                    )}
                    {!currentWeight && (
                      <p className="text-xs text-muted-foreground">No weight entries recorded for this period yet.</p>
                    )}
                    {goal.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{goal.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

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
            <>
              {paginatedWeightEntries.map((entry) => (
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
              ))}
              
              {/* Pagination Controls */}
              {weightTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeightPage(prev => Math.max(1, prev - 1))}
                    disabled={weightPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {weightPage} of {weightTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeightPage(prev => Math.min(weightTotalPages, prev + 1))}
                    disabled={weightPage === weightTotalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
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
          <Dialog 
            open={photoDialogOpen} 
            onOpenChange={(open) => {
              setPhotoDialogOpen(open)
              if (!open) {
                // Reset form when dialog closes
                setPhotoForm({
                  file: null,
                  date: new Date().toISOString().split('T')[0],
                  type: "",
                  notes: ""
                })
                setPhotoPreview(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1 h-4 w-4" />
                {t("common.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-md">
              <DialogHeader>
                <DialogTitle>{t("progress.addProgressPhoto")}</DialogTitle>
                <DialogDescription>{t("progress.uploadPhotoDescription")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadPhoto} className="space-y-4 py-4">
                {/* Drag & Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                    photoPreview 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-background/50 hover:border-primary/50 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!photoPreview && fileInputRef.current) {
                      fileInputRef.current.click()
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <div className="space-y-2">
                      <div className="relative aspect-[3/4] max-h-64 mx-auto rounded-lg overflow-hidden">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 z-10"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setPhotoPreview(null)
                            setPhotoForm(prev => ({ ...prev, file: null }))
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        {photoForm.file?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo-date">{t("workouts.date")}</Label>
                  <Input
                    id="photo-date"
                    type="date"
                    className="bg-background"
                    value={photoForm.date}
                    onChange={(e) => setPhotoForm({ ...photoForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo-type">Photo Type (Optional)</Label>
                  <Select
                    value={photoForm.type || undefined}
                    onValueChange={(value) => setPhotoForm({ ...photoForm, type: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">Front</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo-notes">Notes (Optional)</Label>
                  <Input
                    id="photo-notes"
                    type="text"
                    placeholder="e.g., Morning photo"
                    className="bg-background"
                    value={photoForm.notes}
                    onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={uploadingPhoto || !photoForm.file}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("progress.uploadPhoto")}
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : progressPhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-2">{t("progress.noPhotos")}</p>
            ) : (
              paginatedProgressPhotos.map((photo) => (
                <div key={photo.id} className="group relative space-y-2">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg bg-background relative">
                    {photo.url ? (
                      <>
                        <img
                          src={photo.url}
                          alt={`Progress photo from ${format(new Date(photo.date), "MMM d, yyyy")}`}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                        >
                          {deletingPhotoId === photo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {format(new Date(photo.date), "MMM d, yyyy")}
                    {photo.type && ` (${photo.type})`}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination Controls for Photos */}
          {photoTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoPage(prev => Math.max(1, prev - 1))}
                disabled={photoPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {photoPage} of {photoTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoPage(prev => Math.min(photoTotalPages, prev + 1))}
                disabled={photoPage === photoTotalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
