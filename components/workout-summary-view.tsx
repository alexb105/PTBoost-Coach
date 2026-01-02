"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, ArrowLeft, Smile, Meh, Frown, TrendingUp, Calendar, Trophy, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { extractAndNormalizeExerciseName } from "@/lib/exercise-utils"
import type { WorkoutDetail, ExerciseCompletion } from "./workout-detail-view"

interface WorkoutSummaryViewProps {
  workout: WorkoutDetail
  onBack: () => void
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

  // Check for new cardio format: "[CARDIO] Exercise Name | 30min | 5km | Moderate - Notes"
  if (exerciseStr.startsWith("[CARDIO]")) {
    const cardioStr = exerciseStr.replace("[CARDIO]", "").trim()
    
    // Split by " - " to separate notes
    const parts = cardioStr.split(" - ")
    const notes = parts.length > 1 ? parts[1].trim() : ""
    const mainPart = parts[0].trim()
    
    // Split by " | " to get name and cardio details
    const segments = mainPart.split(" | ")
    const name = segments[0].trim()
    
    let duration_minutes = ""
    let distance_km = ""
    let intensity = ""
    
    // Parse cardio details from remaining segments
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i].trim()
      if (segment.endsWith("min")) {
        duration_minutes = segment.replace("min", "")
      } else if (segment.endsWith("km")) {
        distance_km = segment.replace("km", "")
      } else {
        // Assume it's intensity
        intensity = segment
      }
    }
    
    return {
      name,
      exercise_type: "cardio",
      sets: "",
      reps: "",
      type: "reps",
      weight: "",
      duration_minutes,
      distance_km,
      intensity,
      notes,
    }
  }

  // Check if this is the old cardio exercise format (contains "Duration:", "Distance:", or "Intensity:")
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

const getRatingColor = (rating: "easy" | "good" | "hard" | "too_hard") => {
  switch (rating) {
    case "easy":
      return "bg-green-500/20 text-green-500 border-green-500/30"
    case "good":
      return "bg-blue-500/20 text-blue-500 border-blue-500/30"
    case "hard":
      return "bg-orange-500/20 text-orange-500 border-orange-500/30"
    case "too_hard":
      return "bg-red-500/20 text-red-500 border-red-500/30"
  }
}

interface ExercisePB {
  id: string
  customer_id: string
  exercise_name: string
  reps?: string
  weight?: string
  seconds?: string
  duration_minutes?: string
  distance_km?: string
  intensity?: string
  workout_id?: string
  workout_date?: string
  created_at: string
  updated_at: string
}

interface PBHistoryEntry {
  workout_id: string
  workout_date: string
  reps?: string
  weight?: string
  seconds?: string
  duration_minutes?: string
  distance_km?: string
  intensity?: string
  completed_at?: string
}

const formatPBValue = (entry: ExercisePB | PBHistoryEntry): string => {
  const parts: string[] = []
  
  // Check if it's cardio (has cardio fields)
  if ('duration_minutes' in entry || 'distance_km' in entry || 'intensity' in entry) {
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
  } else if (parts.length === 2 && !('duration_minutes' in entry || 'distance_km' in entry)) {
    return `${parts[0]} at ${parts[1]}`
  } else {
    return parts.join(" • ")
  }
}

export function WorkoutSummaryView({ workout, onBack, customerId }: WorkoutSummaryViewProps) {
  const router = useRouter()
  const [pbDialogOpen, setPbDialogOpen] = useState(false)
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [pb, setPb] = useState<ExercisePB | null>(null)
  const [pbHistory, setPbHistory] = useState<PBHistoryEntry[]>([])

  const parsedExercises = workout.exercises && workout.exercises.length > 0
    ? workout.exercises.map(parseExercise).filter((ex) => ex.name.trim())
    : []

  const exerciseCompletions = workout.exercise_completions || []
  const completedExercises = exerciseCompletions.filter(ec => ec.completed)
  const completionRate = parsedExercises.length > 0 
    ? (completedExercises.length / parsedExercises.length) * 100 
    : 0

  // Calculate rating distribution
  const ratingCounts = {
    easy: completedExercises.filter(ec => ec.rating === "easy").length,
    good: completedExercises.filter(ec => ec.rating === "good").length,
    hard: completedExercises.filter(ec => ec.rating === "hard").length,
    too_hard: completedExercises.filter(ec => ec.rating === "too_hard").length,
  }

  const workoutDate = parseISO(workout.date)

  const getExerciseCompletion = (index: number): ExerciseCompletion | undefined => {
    return exerciseCompletions.find(ec => ec.exerciseIndex === index && ec.completed)
  }

  const fetchExercisePB = async (exerciseName: string) => {
    if (!exerciseName.trim()) {
      toast.error("Exercise name is required")
      return
    }

    try {
      setLoading(true)
      setSelectedExerciseName(exerciseName)
      setPbDialogOpen(true)
      
      const normalizedName = extractAndNormalizeExerciseName(exerciseName)
      const encodedName = encodeURIComponent(normalizedName)
      
      // Use admin API if customerId is provided (admin context), otherwise use customer API
      const apiUrl = customerId 
        ? `/api/admin/customers/${customerId}/exercises/${encodedName}`
        : `/api/customer/exercises/${encodedName}`
      
      const response = await fetch(apiUrl, {
        credentials: 'include', // Include cookies for authentication
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle unauthorized gracefully - user might not be logged in or session expired
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
      // Only show error toast if it's not already handled (like 401)
      if (error.message && !error.message.includes("Please log in")) {
        toast.error(error.message || "Failed to load exercise personal bests")
      }
      setPb(null)
      setPbHistory([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
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
              Workout Summary
            </h1>
            {workout.completed && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Completed
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(workoutDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Performance Overview */}
      <Card className="p-6 bg-card/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Performance Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(completionRate)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {completedExercises.length} / {parsedExercises.length}
                  </span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Exercise Ratings</p>
              <div className="space-y-2">
                {ratingCounts.easy > 0 && (
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Easy: {ratingCounts.easy}</span>
                  </div>
                )}
                {ratingCounts.good > 0 && (
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Good: {ratingCounts.good}</span>
                  </div>
                )}
                {ratingCounts.hard > 0 && (
                  <div className="flex items-center gap-2">
                    <Meh className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Hard: {ratingCounts.hard}</span>
                  </div>
                )}
                {ratingCounts.too_hard > 0 && (
                  <div className="flex items-center gap-2">
                    <Frown className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Too Hard: {ratingCounts.too_hard}</span>
                  </div>
                )}
                {completedExercises.length === 0 && (
                  <p className="text-sm text-muted-foreground">No exercises completed yet</p>
                )}
              </div>
            </div>

            {workout.completed_at && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Completed On</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(parseISO(workout.completed_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Exercises */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Exercise Performance</h2>
          <span className="text-sm text-muted-foreground">
            {parsedExercises.length} {parsedExercises.length === 1 ? "exercise" : "exercises"}
          </span>
        </div>

        {parsedExercises.length === 0 ? (
          <Card className="p-8 text-center bg-card/50">
            <p className="text-muted-foreground">No exercises in this workout</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {parsedExercises.map((exercise, index) => {
              const completion = getExerciseCompletion(index)
              const isCompleted = !!completion
              
              return (
                <Card 
                  key={index} 
                  className={`p-5 transition-colors ${
                    isCompleted 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-card/50 border-border/50"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Exercise Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-semibold text-sm ${
                          isCompleted 
                            ? "bg-green-500/20 text-green-500" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-foreground">
                              {exercise.name}
                            </h3>
                            {completion?.rating && (
                              <Badge className={getRatingColor(completion.rating)}>
                                <span className="flex items-center gap-1.5">
                                  {getRatingIcon(completion.rating)}
                                  {getRatingLabel(completion.rating)}
                                </span>
                              </Badge>
                            )}
                            {!isCompleted && (
                              <Badge variant="outline" className="text-xs">
                                Not Completed
                              </Badge>
                            )}
                          </div>
                          {exercise.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {exercise.notes}
                            </p>
                          )}
                          {completion?.completed_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed: {format(parseISO(completion.completed_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fetchExercisePB(exercise.name)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        title="View Personal Best"
                      >
                        <Trophy className="h-4 w-4" />
                      </Button>
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

                    {/* Best Set Performance */}
                    {completion?.bestSet && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Best Set Performance</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-primary/5 rounded-lg">
                            {completion.bestSet.reps && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Reps</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.reps}</p>
                              </div>
                            )}
                            {completion.bestSet.seconds && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Seconds</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.seconds}s</p>
                              </div>
                            )}
                            {completion.bestSet.weight && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Weight</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.weight}</p>
                              </div>
                            )}
                            {completion.bestSet.duration_minutes && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.duration_minutes} min</p>
                              </div>
                            )}
                            {completion.bestSet.distance_km && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Distance</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.distance_km} km</p>
                              </div>
                            )}
                            {completion.bestSet.intensity && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Intensity</p>
                                <p className="text-base font-semibold text-foreground">{completion.bestSet.intensity}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

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

          {loading ? (
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

