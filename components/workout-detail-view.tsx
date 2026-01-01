"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Clock, ArrowLeft, Loader2, Smile, Meh, Frown, AlertCircle, X, ExternalLink } from "lucide-react"
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
  onExerciseComplete?: (workoutId: string, exerciseIndex: number, rating: "easy" | "good" | "hard" | "too_hard", bestSet?: { reps?: string; weight?: string; seconds?: string }) => Promise<void>
  onExerciseUncomplete?: (workoutId: string, exerciseIndex: number) => Promise<void>
}

// Helper function to parse exercise string into structured format
function parseExercise(exerciseStr: string): {
  name: string
  sets: string
  reps: string
  type: "reps" | "seconds"
  weight?: string
  notes?: string
} {
  if (!exerciseStr || !exerciseStr.trim()) {
    return { name: "", sets: "", reps: "", type: "reps", weight: "", notes: "" }
  }

  const parts = exerciseStr.split(" - ")
  const notes = parts.length > 1 ? parts[1].trim() : ""
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
  
  return { name, sets, reps, type, weight, notes }
}

export function WorkoutDetailView({ workout, onBack, onComplete, onUncomplete, onExerciseComplete, onExerciseUncomplete }: WorkoutDetailViewProps) {
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
  const [bestSet, setBestSet] = useState<{ reps?: string; weight?: string; seconds?: string }>({})
  const [selectedRating, setSelectedRating] = useState<"easy" | "good" | "hard" | "too_hard" | null>(null)

  // Update exercise completions when workout prop changes
  useEffect(() => {
    if (workout.exercise_completions) {
      setExerciseCompletions(workout.exercise_completions)
    }
  }, [workout.exercise_completions])

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
      
      // Update local state
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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6 pb-20">
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
                    </div>

                    <Separator />

                    {/* Exercise Details */}
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
                <Label>Best Set (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Record your best performance for this exercise
                </p>
              </div>
              
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
    </div>
  )
}

