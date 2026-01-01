"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Clock, ArrowLeft, Loader2, Smile, Meh, Frown, AlertCircle, X, ExternalLink, Info, Trophy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { extractAndNormalizeExerciseName } from "@/lib/exercise-utils"
import { useLanguage } from "@/contexts/language-context"

export interface ExerciseCompletion {
  exerciseIndex: number
  completed: boolean
  rating?: "easy" | "good" | "hard" | "too_hard"
  completed_at?: string
  bestSet?: {
    reps?: string
    weight?: string
    seconds?: string
    duration_minutes?: string
    distance_km?: string
    intensity?: string
  }
}

export interface WorkoutDetail {
  id: string
  title: string
  description?: string
  date: string
  exercises?: string[]
  completed?: boolean
  completed_at?: string
  exercise_completions?: ExerciseCompletion[]
}

interface WorkoutDetailViewProps {
  workout: WorkoutDetail
  onBack: () => void
  onComplete?: (workoutId: string) => Promise<void>
  onUncomplete?: (workoutId: string) => Promise<void>
  onExerciseComplete?: (workoutId: string, exerciseIndex: number, rating: "easy" | "good" | "hard" | "too_hard", bestSet?: { reps?: string; weight?: string; seconds?: string; duration_minutes?: string; distance_km?: string; intensity?: string }) => Promise<void>
  onExerciseUncomplete?: (workoutId: string, exerciseIndex: number) => Promise<void>
  customerId?: string // Optional customer ID for admin context
}

// Helper function to parse exercise string into structured format
function parseExercise(exerciseStr: string): {
  name: string
  exercise_type: "cardio" | "sets"
  sets: string
  reps: string
  type: "reps" | "seconds"
  weight?: string
  duration_minutes?: string
  distance_km?: string
  intensity?: string
  notes?: string
} {
  if (!exerciseStr || !exerciseStr.trim()) {
    return { name: "", exercise_type: "sets", sets: "", reps: "", type: "reps", weight: "", notes: "" }
  }

  // Check if this is a cardio exercise format (contains "Duration:", "Distance:", or "Intensity:")
  const isCardioFormat = exerciseStr.includes("Duration:") || exerciseStr.includes("Distance:") || exerciseStr.includes("Intensity:")
  
  if (isCardioFormat) {
    // Cardio format: "Exercise Name - Duration: 30min, Distance: 5.0km, Intensity: Moderate - Notes"
    const parts = exerciseStr.split(" - ")
    let notes = ""
    let mainPart = parts[0].trim()
    let cardioData = ""
    
    // Check if last part looks like notes (doesn't contain cardio keywords)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]
      if (!lastPart.includes("Duration:") && !lastPart.includes("Distance:") && !lastPart.includes("Intensity:")) {
        notes = lastPart.trim()
        // Everything between first and last is cardio data
        cardioData = parts.slice(1, -1).join(" - ").trim()
      } else {
        // No notes, all middle parts are cardio data
        cardioData = parts.slice(1).join(" - ").trim()
      }
    }
    
    // Extract cardio values
    let duration_minutes = ""
    let distance_km = ""
    let intensity = ""
    
    const durationMatch = cardioData.match(/Duration:\s*(\d+)\s*min/i)
    if (durationMatch) {
      duration_minutes = durationMatch[1]
    }
    
    const distanceMatch = cardioData.match(/Distance:\s*([\d.]+)\s*km/i)
    if (distanceMatch) {
      distance_km = distanceMatch[1]
    }
    
    const intensityMatch = cardioData.match(/Intensity:\s*([^,]+)/i)
    if (intensityMatch) {
      intensity = intensityMatch[1].trim()
    }
    
    return { 
      name: mainPart, 
      exercise_type: "cardio", 
      sets: "", 
      reps: "", 
      type: "reps", 
      weight: "", 
      duration_minutes,
      distance_km,
      intensity,
      notes 
    }
  } else {
    // Sets-based format: "Exercise Name 3x8 @ 50kg - Notes"
    const parts = exerciseStr.split(" - ")
    const notes = parts.length > 1 ? parts[parts.length - 1].trim() : ""
    let mainPart = parts[0].trim()
    
    const weightMatch = mainPart.match(/@\s*([^-]+?)(?:\s*-\s*|$)/)
    let weight = ""
    if (weightMatch) {
      weight = weightMatch[1].trim()
      mainPart = mainPart.replace(/@\s*[^-]+?(\s*-\s*|$)/, "").trim()
    }
    
    const setsRepsMatch = mainPart.match(/(\d+)x([\d-]+)(s)?/)
    let sets = ""
    let reps = ""
    let type: "reps" | "seconds" = "reps"
    if (setsRepsMatch) {
      sets = setsRepsMatch[1]
      reps = setsRepsMatch[2]
      type = setsRepsMatch[3] === "s" ? "seconds" : "reps"
      mainPart = mainPart.replace(/\d+x[\d-]+s?/, "").trim()
    }
    
    const name = mainPart.trim()
    
    return { name, exercise_type: "sets", sets, reps, type, weight, notes }
  }
}

// Helper function to convert video URLs to embed format
function convertToEmbedUrl(url: string): string {
  if (!url) return url
  
  // YouTube URLs
  // Handle various YouTube URL formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID (already embed format)
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const youtubeMatch = url.match(youtubeRegex)
  
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  
  // Vimeo URLs
  // Handle various Vimeo URL formats:
  // - https://vimeo.com/VIDEO_ID
  // - https://player.vimeo.com/video/VIDEO_ID (already embed format)
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/
  const vimeoMatch = url.match(vimeoRegex)
  
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  
  // If it's already an embed URL or doesn't match patterns, return as-is
  return url
}

export function WorkoutDetailView({ workout, onBack, onComplete, onUncomplete, onExerciseComplete, onExerciseUncomplete, customerId }: WorkoutDetailViewProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(workout.completed || false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [exerciseCompletions, setExerciseCompletions] = useState<ExerciseCompletion[]>(
    workout.exercise_completions || []
  )
  const [bestSet, setBestSet] = useState<{ 
    reps?: string; 
    weight?: string; 
    seconds?: string;
    duration_minutes?: string;
    distance_km?: string;
    intensity?: string;
  }>({})
  const [selectedRating, setSelectedRating] = useState<"easy" | "good" | "hard" | "too_hard" | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<{
    name: string
    video_url?: string | null
    image_url?: string | null
    display_name?: string
    description?: string | null
  } | null>(null)
  const [loadingExerciseInfo, setLoadingExerciseInfo] = useState(false)
  const [exerciseInfoCache, setExerciseInfoCache] = useState<Record<string, { video_url?: string | null; description?: string | null }>>({})
  const [pbDialogOpen, setPbDialogOpen] = useState(false)
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("")
  const [loadingPB, setLoadingPB] = useState(false)
  const [pb, setPb] = useState<any>(null)
  const [pbHistory, setPbHistory] = useState<any[]>([])

  // Update exercise completions when workout prop changes
  useEffect(() => {
    if (workout.exercise_completions) {
      setExerciseCompletions(workout.exercise_completions)
    } else {
      setExerciseCompletions([])
    }
    // Also update completed status
    setIsCompleted(workout.completed || false)
  }, [workout.exercise_completions, workout.completed, workout.id])

  // Pre-fetch exercise info to determine which exercises have content
  useEffect(() => {
    const fetchExerciseInfo = async () => {
      if (!workout.exercises || workout.exercises.length === 0) return
      
      const infoPromises = workout.exercises.map(async (exerciseStr) => {
        const normalizedName = extractAndNormalizeExerciseName(exerciseStr.split(' - ')[0].trim())
        const encodedName = encodeURIComponent(normalizedName)
        
        // Skip if already cached
        if (exerciseInfoCache[normalizedName]) return
        
        try {
          const apiUrl = customerId 
            ? `/api/admin/exercises/info/${encodedName}`
            : `/api/customer/exercises/${encodedName}/info`
          
          const response = await fetch(apiUrl, {
            credentials: 'include',
          })
          
          if (response.ok) {
            const data = await response.json()
            return {
              name: normalizedName,
              video_url: data.exercise?.video_url,
              description: data.exercise?.description,
            }
          }
        } catch (error) {
          console.error('Error fetching exercise info:', error)
        }
        return null
      })
      
      const results = await Promise.all(infoPromises)
      const newCache: Record<string, { video_url?: string | null; description?: string | null }> = {}
      
      results.forEach((result) => {
        if (result) {
          newCache[result.name] = {
            video_url: result.video_url,
            description: result.description,
          }
        }
      })
      
      if (Object.keys(newCache).length > 0) {
        setExerciseInfoCache(prev => ({ ...prev, ...newCache }))
      }
    }
    
    fetchExerciseInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.exercises, customerId])

  const handleComplete = async () => {
    if (!onComplete) return

    try {
      setIsCompleting(true)
      await onComplete(workout.id)
      setIsCompleted(true)
      toast.success("Workout marked as complete! Great job! 💪")
    } catch (error) {
      toast.error("Failed to mark workout as complete")
      console.error("Error completing workout:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleUncomplete = async () => {
    if (!onUncomplete) return

    try {
      setIsCompleting(true)
      await onUncomplete(workout.id)
      setIsCompleted(false)
      toast.success("Workout marked as incomplete")
    } catch (error) {
      toast.error("Failed to uncomplete workout")
      console.error("Error uncompleting workout:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleExerciseUncomplete = async (index: number) => {
    if (!onExerciseUncomplete) return

    try {
      await onExerciseUncomplete(workout.id, index)
      
      // Update local state
      setExerciseCompletions(prev => 
        prev.filter(ec => ec.exerciseIndex !== index)
      )
      
      toast.success("Exercise marked as incomplete")
    } catch (error) {
      toast.error("Failed to uncomplete exercise")
      console.error("Error uncompleting exercise:", error)
    }
  }

  const parsedExercises = workout.exercises && workout.exercises.length > 0
    ? workout.exercises.map(parseExercise).filter((ex) => ex.name.trim())
    : []

  const workoutDate = parseISO(workout.date)
  const isToday = format(new Date(), "yyyy-MM-dd") === format(workoutDate, "yyyy-MM-dd")
  const isPast = workoutDate < new Date() && !isToday

  const isExerciseCompleted = (index: number) => {
    return exerciseCompletions.some(ec => ec.exerciseIndex === index && ec.completed)
  }

  const getExerciseRating = (index: number): "easy" | "good" | "hard" | "too_hard" | null => {
    const completion = exerciseCompletions.find(ec => ec.exerciseIndex === index && ec.completed)
    return completion?.rating || null
  }

  const handleExerciseComplete = (index: number) => {
    if (isExerciseCompleted(index)) return
    setSelectedExerciseIndex(index)
    setBestSet({})
    setSelectedRating(null)
    setFeedbackDialogOpen(true)
  }

  const handleRatingSelect = (rating: "easy" | "good" | "hard" | "too_hard") => {
    setSelectedRating(rating)
  }

  const handleFeedbackSubmit = async () => {
    if (selectedExerciseIndex === null || !onExerciseComplete || !selectedRating) return

    try {
      setIsSubmittingFeedback(true)
      await onExerciseComplete(workout.id, selectedExerciseIndex, selectedRating, bestSet)
      
      // The API call should have updated the database, and the parent component
      // should refresh the workout data. We update local state optimistically,
      // but the parent component's refresh will ensure we have the latest from DB.
      setExerciseCompletions(prev => [
        ...prev.filter(ec => ec.exerciseIndex !== selectedExerciseIndex),
        {
          exerciseIndex: selectedExerciseIndex,
          completed: true,
          rating: selectedRating,
          completed_at: new Date().toISOString(),
          bestSet: Object.keys(bestSet).length > 0 ? bestSet : undefined,
        }
      ])
      
      setFeedbackDialogOpen(false)
      setSelectedExerciseIndex(null)
      setBestSet({})
      setSelectedRating(null)
      toast.success("Exercise completed! Great work! 💪")
    } catch (error) {
      toast.error("Failed to complete exercise")
      console.error("Error completing exercise:", error)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const getRatingIcon = (rating: "easy" | "good" | "hard" | "too_hard") => {
    switch (rating) {
      case "easy":
        return <Smile className="h-5 w-5 text-green-500" />
      case "good":
        return <Smile className="h-5 w-5 text-blue-500" />
      case "hard":
        return <Meh className="h-5 w-5 text-orange-500" />
      case "too_hard":
        return <Frown className="h-5 w-5 text-red-500" />
    }
  }

  const getRatingLabel = (rating: "easy" | "good" | "hard" | "too_hard") => {
    switch (rating) {
      case "easy":
        return "Easy"
      case "good":
        return "Good"
      case "hard":
        return "Hard"
      case "too_hard":
        return "Too Hard"
    }
  }

  const selectedExercise = selectedExerciseIndex !== null ? parsedExercises[selectedExerciseIndex] : null
  const isTimeBased = selectedExercise?.type === "seconds"
  const isCardio = selectedExercise?.exercise_type === "cardio"

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {workout.title}
            </h1>
            {isCompleted && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t("workouts.completed")}
              </Badge>
            )}
            {!isCompleted && isToday && (
              <Badge variant="secondary" className="px-3 py-1">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {t("workouts.today")}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(workoutDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Description */}
      {workout.description && (
        <Card className="p-5 bg-card/50">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {workout.description}
          </p>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Exercises</h2>
          <span className="text-sm text-muted-foreground">
            {parsedExercises.length} {parsedExercises.length === 1 ? "exercise" : "exercises"}
          </span>
        </div>

        {parsedExercises.length === 0 ? (
          <Card className="p-8 text-center bg-card/50">
            <p className="text-muted-foreground">No exercises added to this workout</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {parsedExercises.map((exercise, index) => {
              const completed = isExerciseCompleted(index)
              const rating = getExerciseRating(index)
              
              return (
                <Card 
                  key={index} 
                  className={`p-5 transition-colors ${
                    completed 
                      ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15" 
                      : "bg-card/50 hover:bg-card/70"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Exercise Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-sm ${
                          completed 
                            ? "bg-green-500/20 text-green-500" 
                            : "bg-primary/10 text-primary"
                        }`}>
                          {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                // Use normalized exercise name for consistent matching
                                const normalizedName = extractAndNormalizeExerciseName(exercise.name)
                                const encodedName = encodeURIComponent(normalizedName)
                                router.push(`/exercises/${encodedName}`)
                              }}
                              className="text-lg font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                            >
                              {exercise.name}
                              <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            {completed && rating && (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-2 py-0.5">
                                <span className="flex items-center gap-1.5">
                                  {getRatingIcon(rating)}
                                  {getRatingLabel(rating)}
                                </span>
                              </Badge>
                            )}
                          </div>
                          {exercise.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* PB Trophy Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const normalizedName = extractAndNormalizeExerciseName(exercise.name)
                            const encodedName = encodeURIComponent(normalizedName)
                            
                            setLoadingPB(true)
                            setSelectedExerciseName(exercise.name)
                            setPbDialogOpen(true)
                            
                            try {
                              // Use admin API if customerId is provided (admin context), otherwise use customer API
                              const apiUrl = customerId 
                                ? `/api/admin/customers/${customerId}/exercises/${encodedName}`
                                : `/api/customer/exercises/${encodedName}`
                              
                              const response = await fetch(apiUrl, {
                                credentials: 'include',
                              })
                              
                              if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}))
                                
                                if (response.status === 401) {
                                  toast.error("Please log in to view personal bests")
                                  setPb(null)
                                  setPbHistory([])
                                  return
                                }
                                
                                throw new Error(errorData.error || `Failed to fetch exercise PB: ${response.status} ${response.statusText}`)
                              }
                              
                              const data = await response.json()
                              setPb(data.pb || null)
                              setPbHistory(data.history || [])
                            } catch (error: any) {
                              console.error("Error fetching exercise PB:", error)
                              if (error.message && !error.message.includes("Please log in")) {
                                toast.error(error.message || "Failed to load exercise personal bests")
                              }
                              setPb(null)
                              setPbHistory([])
                            } finally {
                              setLoadingPB(false)
                            }
                          }}
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          title="View Personal Best"
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                        
                        {/* Info Button */}
                        {(() => {
                          // Check cache to see if exercise has video or description
                          const normalizedName = extractAndNormalizeExerciseName(exercise.name)
                          const cachedInfo = exerciseInfoCache[normalizedName]
                          
                          // Only show button if we know there's content (video or description)
                          if (cachedInfo && !cachedInfo.video_url && !cachedInfo.description) {
                            return null
                          }
                          
                          // Show button if we have content or haven't checked yet
                          const hasContent = cachedInfo ? (cachedInfo.video_url || cachedInfo.description) : true
                          
                          if (!hasContent && cachedInfo) {
                            return null
                          }
                          
                          return (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                const encodedName = encodeURIComponent(normalizedName)
                                
                                setLoadingExerciseInfo(true)
                                setInfoDialogOpen(true)
                                setSelectedExerciseInfo({ name: exercise.name })
                                
                                try {
                                  // Use admin API if customerId is provided (admin context), otherwise use customer API
                                  const apiUrl = customerId 
                                    ? `/api/admin/exercises/info/${encodedName}`
                                    : `/api/customer/exercises/${encodedName}/info`
                                  
                                  const response = await fetch(apiUrl, {
                                    credentials: 'include',
                                  })
                                  
                                  if (response.ok) {
                                    const data = await response.json()
                                    const exerciseData = {
                                      name: exercise.name,
                                      video_url: data.exercise?.video_url,
                                      image_url: data.exercise?.image_url,
                                      display_name: data.exercise?.display_name,
                                      description: data.exercise?.description,
                                    }
                                    
                                    // Cache the info
                                    setExerciseInfoCache(prev => ({
                                      ...prev,
                                      [normalizedName]: {
                                        video_url: exerciseData.video_url,
                                        description: exerciseData.description,
                                      }
                                    }))
                                    
                                    // Always set the exercise data, even if no video/description
                                    setSelectedExerciseInfo(exerciseData)
                                  } else {
                                    // Exercise info not found, cache that there's no info
                                    setExerciseInfoCache(prev => ({
                                      ...prev,
                                      [normalizedName]: { video_url: null, description: null }
                                    }))
                                    setSelectedExerciseInfo({ name: exercise.name })
                                  }
                                } catch (error) {
                                  console.error('Error fetching exercise info:', error)
                                  toast.error('Failed to load exercise information')
                                  setSelectedExerciseInfo({ name: exercise.name })
                                } finally {
                                  setLoadingExerciseInfo(false)
                                }
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View Exercise Info"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          )
                        })()}
                      </div>
                    </div>

                    <Separator />

                    {/* Exercise Details */}
                    {exercise.exercise_type === "cardio" ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {exercise.duration_minutes && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
                            <p className="text-lg font-semibold text-foreground">{exercise.duration_minutes} min</p>
                          </div>
                        )}
                        {exercise.distance_km && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Distance</p>
                            <p className="text-lg font-semibold text-foreground">{exercise.distance_km} km</p>
                          </div>
                        )}
                        {exercise.intensity && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Intensity</p>
                            <p className="text-lg font-semibold text-foreground">{exercise.intensity}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sets</p>
                          <p className="text-lg font-semibold text-foreground">{exercise.sets || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {exercise.type === "seconds" ? "Seconds" : "Reps"}
                          </p>
                          <p className="text-lg font-semibold text-foreground">{exercise.reps || "-"}</p>
                        </div>
                        {exercise.weight && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Weight</p>
                            <p className="text-lg font-semibold text-foreground">{exercise.weight}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Complete/Uncomplete Exercise Button */}
                    {!completed && (isToday || isPast) && (
                      <div className="pt-2">
                        <Button
                          onClick={() => handleExerciseComplete(index)}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Exercise as Complete
                        </Button>
                      </div>
                    )}
                    {completed && onExerciseUncomplete && (
                      <div className="pt-2">
                        <Button
                          onClick={() => handleExerciseUncomplete(index)}
                          variant="outline"
                          className="w-full gap-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                          Mark Exercise as Incomplete
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Complete Button */}
      {!isCompleted && (isToday || isPast) && (
        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Ready to mark this workout as complete?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your trainer will be notified when you complete this session
              </p>
            </div>
            <Button
              onClick={handleComplete}
              disabled={isCompleting}
              size="lg"
              className="gap-2"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("workouts.completing")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Complete
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {isCompleted && workout.completed_at && (
        <Card className="p-5 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-foreground">Workout Completed</p>
              <p className="text-sm text-muted-foreground">
                Completed on {format(parseISO(workout.completed_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How did it go?</DialogTitle>
            <DialogDescription>
              {selectedExercise && (
                <>Rate your performance for <strong>{selectedExercise.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {!selectedRating ? (
            // Step 1: Select Rating
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button
                onClick={() => handleRatingSelect("easy")}
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-green-500/10 hover:border-green-500/30"
              >
                <Smile className="h-6 w-6 text-green-500" />
                <span>Easy</span>
              </Button>
              <Button
                onClick={() => handleRatingSelect("good")}
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-blue-500/10 hover:border-blue-500/30"
              >
                <Smile className="h-6 w-6 text-blue-500" />
                <span>Good</span>
              </Button>
              <Button
                onClick={() => handleRatingSelect("hard")}
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-orange-500/10 hover:border-orange-500/30"
              >
                <Meh className="h-6 w-6 text-orange-500" />
                <span>Hard</span>
              </Button>
              <Button
                onClick={() => handleRatingSelect("too_hard")}
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <Frown className="h-6 w-6 text-red-500" />
                <span>Too Hard</span>
              </Button>
            </div>
          ) : (
            // Step 2: Enter Best Set (Optional)
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{isCardio ? "Performance Details (Optional)" : "Best Set (Optional)"}</Label>
                <p className="text-xs text-muted-foreground">
                  Record your best performance for this exercise
                </p>
              </div>
              
              {isCardio ? (
                // Cardio exercise fields
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="best-duration">Duration (minutes)</Label>
                    <Input
                      id="best-duration"
                      type="number"
                      min="1"
                      value={bestSet.duration_minutes || ""}
                      onChange={(e) => setBestSet({ ...bestSet, duration_minutes: e.target.value })}
                      placeholder="e.g., 30"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="best-distance">Distance (km)</Label>
                    <Input
                      id="best-distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={bestSet.distance_km || ""}
                      onChange={(e) => setBestSet({ ...bestSet, distance_km: e.target.value })}
                      placeholder="e.g., 5.0"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="best-intensity">Intensity (optional)</Label>
                    <Input
                      id="best-intensity"
                      value={bestSet.intensity || ""}
                      onChange={(e) => setBestSet({ ...bestSet, intensity: e.target.value })}
                      placeholder="e.g., Moderate, High, Low"
                      className="bg-background"
                    />
                  </div>
                </div>
              ) : (
                // Sets-based exercise fields
                <div className="grid grid-cols-2 gap-3">
                  {!isTimeBased ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="best-reps">Reps</Label>
                        <Input
                          id="best-reps"
                          type="number"
                          min="1"
                          value={bestSet.reps || ""}
                          onChange={(e) => setBestSet({ ...bestSet, reps: e.target.value })}
                          placeholder="e.g., 12"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="best-weight">Weight (optional)</Label>
                        <Input
                          id="best-weight"
                          value={bestSet.weight || ""}
                          onChange={(e) => setBestSet({ ...bestSet, weight: e.target.value })}
                          placeholder="e.g., 50kg"
                          className="bg-background"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="best-seconds">Seconds</Label>
                      <Input
                        id="best-seconds"
                        type="number"
                        min="1"
                        value={bestSet.seconds || ""}
                        onChange={(e) => setBestSet({ ...bestSet, seconds: e.target.value })}
                        placeholder="e.g., 45"
                        className="bg-background"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setSelectedRating(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFeedbackSubmit}
                  disabled={isSubmittingFeedback}
                  className="flex-1"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Exercise"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExerciseInfo?.display_name || selectedExerciseInfo?.name || 'Exercise Information'}</DialogTitle>
            <DialogDescription>
              View exercise demonstration and details
            </DialogDescription>
          </DialogHeader>
          
          {loadingExerciseInfo ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video */}
              {selectedExerciseInfo?.video_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Exercise Video</Label>
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={convertToEmbedUrl(selectedExerciseInfo.video_url)}
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${selectedExerciseInfo.display_name || selectedExerciseInfo.name} demonstration`}
                    />
                  </div>
                </div>
              )}
              
              {/* Image fallback if no video */}
              {!selectedExerciseInfo?.video_url && selectedExerciseInfo?.image_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Exercise Image</Label>
                  <img
                    src={selectedExerciseInfo.image_url}
                    alt={selectedExerciseInfo.display_name || selectedExerciseInfo.name}
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              
              {/* Description/Info */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Exercise Description</Label>
                <Card className="p-4 bg-card/50">
                  {selectedExerciseInfo?.description ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedExerciseInfo.description}
                    </p>
                  ) : selectedExerciseInfo?.video_url ? (
                    <p className="text-sm text-foreground leading-relaxed">
                      Watch to learn how to perform this exercise.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No video or description available for this exercise.
                    </p>
                  )}
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Personal Best Dialog */}
      <Dialog open={pbDialogOpen} onOpenChange={setPbDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {selectedExerciseName} - Personal Bests
            </DialogTitle>
            <DialogDescription>
              View your personal best performance for this exercise
            </DialogDescription>
          </DialogHeader>

          {loadingPB ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* PB History */}
              {pbHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">PB History</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pbHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-card border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {formatPBValue(entry as any)}
                          </span>
                          {entry.workout_date && (
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(entry.workout_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {entry.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(parseISO(entry.completed_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to format PB values
function formatPBValue(entry: any): string {
  const parts: string[] = []
  
  // Check if it's cardio (has cardio fields)
  if (entry.duration_minutes || entry.distance_km || entry.intensity) {
    // Cardio PB
    if (entry.duration_minutes) parts.push(`${entry.duration_minutes} min`)
    if (entry.distance_km) parts.push(`${entry.distance_km} km`)
    if (entry.intensity) parts.push(entry.intensity)
  } else {
    // Sets-based PB
    if (entry.reps) {
      parts.push(`${entry.reps} ${entry.reps === "1" ? "rep" : "reps"}`)
    }
    if (entry.weight) {
      // If weight doesn't already have units, assume kg
      const weightValue = entry.weight.trim()
      const hasUnits = /(kg|lbs|lb|kg\.|pounds?)/i.test(weightValue)
      parts.push(hasUnits ? weightValue : `${weightValue}kg`)
    }
    if (entry.seconds) {
      const secondsNum = parseInt(entry.seconds)
      if (secondsNum === 1) {
        parts.push("1 second")
      } else if (secondsNum < 60) {
        parts.push(`${secondsNum} seconds`)
      } else {
        const minutes = Math.floor(secondsNum / 60)
        const remainingSeconds = secondsNum % 60
        if (remainingSeconds === 0) {
          parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`)
        } else {
          parts.push(`${minutes}m ${remainingSeconds}s`)
        }
      }
    }
  }
  
  if (parts.length === 0) {
    return "No PB recorded"
  }
  
  // Format more naturally: "10 reps at 30kg" or "30 seconds" or "30 min • 5.0 km"
  if (parts.length === 1) {
    return parts[0]
  } else if (parts.length === 2 && !(entry.duration_minutes || entry.distance_km)) {
    return `${parts[0]} at ${parts[1]}`
  } else {
    return parts.join(" • ")
  }
}

