"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { X, Trophy, Calendar, Loader2 } from "lucide-react"
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { normalizeExerciseName } from "@/lib/exercise-utils"

export interface ExerciseFormData {
  name: string
  exercise_type?: "cardio" | "sets"
  sets: string
  reps: string
  type: "reps" | "seconds"
  weight?: string
  // Cardio fields
  duration_minutes?: string
  distance_km?: string
  intensity?: string
  notes?: string
}

interface ExerciseFormItemProps {
  exercise: ExerciseFormData
  index: number
  onUpdate: (index: number, field: keyof ExerciseFormData, value: string) => void
  onRemove?: (index: number) => void
  canRemove?: boolean
  idPrefix?: string
  customerId?: string // Customer ID for viewing PBs
}

interface ExercisePB {
  id: string
  reps?: string
  weight?: string
  seconds?: string
  workout_date?: string
}

interface PBHistoryEntry {
  workout_date: string
  reps?: string
  weight?: string
  seconds?: string
  duration_minutes?: string
  distance_km?: string
  intensity?: string
  completed_at?: string
}

interface WorkoutHistoryEntry {
  workout_id: string
  workout_date: string
  workout_title?: string
  sets?: string
  reps?: string
  weight?: string
  seconds?: string
  type?: "reps" | "seconds"
  notes?: string
  completed_at?: string
  bestSet?: {
    reps?: string
    weight?: string
    seconds?: string
  }
}

export function ExerciseFormItem({
  exercise,
  index,
  onUpdate,
  onUpdateMultiple,
  onRemove,
  canRemove = false,
  idPrefix = "exercise",
  customerId,
}: ExerciseFormItemProps) {
  const [pbDialogOpen, setPbDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pb, setPb] = useState<ExercisePB | null>(null)
  const [pbHistory, setPbHistory] = useState<PBHistoryEntry[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([])

  const fetchExercisePB = async () => {
    if (!exercise.name.trim() || !customerId) {
      toast.error("Please enter an exercise name first")
      return
    }

    try {
      setLoading(true)
      setPbDialogOpen(true)
      const normalizedName = normalizeExerciseName(exercise.name)
      const encodedName = encodeURIComponent(normalizedName)
      const response = await fetch(`/api/admin/customers/${customerId}/exercises/${encodedName}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch exercise PB")
      }

      const data = await response.json()
      setPb(data.pb)
      setPbHistory(data.history || [])
    } catch (error) {
      console.error("Error fetching exercise PB:", error)
      toast.error("Failed to load exercise personal bests")
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkoutHistory = async () => {
    if (!exercise.name.trim() || !customerId) {
      toast.error("Please enter an exercise name first")
      return
    }

    try {
      setLoadingHistory(true)
      setHistoryDialogOpen(true)
      const normalizedName = normalizeExerciseName(exercise.name)
      const encodedName = encodeURIComponent(normalizedName)
      const response = await fetch(`/api/admin/customers/${customerId}/exercises/${encodedName}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch workout history")
      }

      const data = await response.json()
      setWorkoutHistory(data.workoutHistory || [])
    } catch (error) {
      console.error("Error fetching workout history:", error)
      toast.error("Failed to load workout history")
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatPBValue = (entry: ExercisePB | PBHistoryEntry) => {
    const parts: string[] = []
    
    // Check if it's cardio (has cardio fields)
    if ('duration_minutes' in entry && entry.duration_minutes || 
        'distance_km' in entry && entry.distance_km || 
        'intensity' in entry && entry.intensity) {
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
    
    // Format more naturally: "10 reps at 30kg" or "30 seconds"
    if (parts.length === 1) {
      return parts[0]
    } else if (parts.length === 2) {
      return `${parts[0]} at ${parts[1]}`
    } else {
      return parts.join(", ")
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {index + 1}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customerId && exercise.name.trim() && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={fetchExercisePB}
                className="h-8 w-8"
                title="View personal bests"
              >
                <Trophy className="h-4 w-4 text-primary" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={fetchWorkoutHistory}
                className="h-8 w-8"
                title="View workout history"
              >
                <Calendar className="h-4 w-4 text-primary" />
              </Button>
            </>
          )}
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <ExerciseAutocomplete
          id={`${idPrefix}-name-${index}`}
          label="Exercise Name"
          value={exercise.name || ""}
          onChange={(value) => {
            onUpdate(index, "name", value)
            // Look up the exercise to get its type when name changes (only if value matches an exercise)
            if (value && value.trim()) {
              fetch("/api/admin/exercises")
                .then(res => res.json())
                .then(data => {
                  const matchedExercise = data.exercises?.find((ex: any) => 
                    ex.display_name.toLowerCase().trim() === value.toLowerCase().trim() || 
                    ex.name.toLowerCase().trim() === value.toLowerCase().trim()
                  )
                  if (matchedExercise && matchedExercise.exercise_type) {
                    console.log('Found exercise type for', value, ':', matchedExercise.exercise_type)
                    // Use onUpdateMultiple if available to update both name and type atomically
                    if (onUpdateMultiple) {
                      onUpdateMultiple(index, { exercise_type: matchedExercise.exercise_type })
                    } else {
                      onUpdate(index, "exercise_type", matchedExercise.exercise_type)
                    }
                  }
                })
                .catch(err => console.error("Error looking up exercise type:", err))
            }
          }}
          onExerciseSelect={(selectedExercise) => {
            // When an exercise is selected, update both name and exercise_type
            if (selectedExercise && selectedExercise.exercise_type) {
              if (onUpdateMultiple) {
                onUpdateMultiple(index, { 
                  exercise_type: selectedExercise.exercise_type,
                  name: selectedExercise.display_name 
                })
              } else {
                onUpdate(index, "name", selectedExercise.display_name)
                onUpdate(index, "exercise_type", selectedExercise.exercise_type)
              }
            }
          }}
          placeholder="e.g., Bench Press"
          required
          className="bg-background"
        />

        {exercise.exercise_type === "cardio" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-duration-${index}`} className="text-xs">Duration (Minutes)</Label>
              <Input
                id={`${idPrefix}-duration-${index}`}
                type="number"
                min="1"
                value={exercise.duration_minutes || ""}
                onChange={(e) => onUpdate(index, "duration_minutes", e.target.value)}
                placeholder="30"
                className="bg-background h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-distance-${index}`} className="text-xs">Distance (km)</Label>
              <Input
                id={`${idPrefix}-distance-${index}`}
                type="number"
                min="0"
                step="0.1"
                value={exercise.distance_km || ""}
                onChange={(e) => onUpdate(index, "distance_km", e.target.value)}
                placeholder="5.0"
                className="bg-background h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-intensity-${index}`} className="text-xs">Intensity</Label>
              <Input
                id={`${idPrefix}-intensity-${index}`}
                type="text"
                value={exercise.intensity || ""}
                onChange={(e) => onUpdate(index, "intensity", e.target.value)}
                placeholder="Moderate, High, Low"
                className="bg-background h-9"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-sets-${index}`} className="text-xs">Sets</Label>
              <Input
                id={`${idPrefix}-sets-${index}`}
                type="number"
                min="1"
                value={exercise.sets || ""}
                onChange={(e) => onUpdate(index, "sets", e.target.value)}
                placeholder="3"
                className="bg-background h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-type-${index}`} className="text-xs">Type</Label>
              <Select
                value={exercise.type || "reps"}
                onValueChange={(value) => onUpdate(index, "type", value as "reps" | "seconds")}
              >
                <SelectTrigger className="bg-background h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reps">Reps</SelectItem>
                  <SelectItem value="seconds">Seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-reps-${index}`} className="text-xs">
                {exercise.type === "seconds" ? "Seconds" : "Reps"}
              </Label>
              <Input
                id={`${idPrefix}-reps-${index}`}
                type="text"
                value={exercise.reps || ""}
                onChange={(e) => onUpdate(index, "reps", e.target.value)}
                placeholder={exercise.type === "seconds" ? "30" : "8-10"}
                className="bg-background h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-weight-${index}`} className="text-xs">Weight</Label>
              <Input
                id={`${idPrefix}-weight-${index}`}
                value={exercise.weight || ""}
                onChange={(e) => onUpdate(index, "weight", e.target.value)}
                placeholder="50kg"
                className="bg-background h-9"
              />
            </div>
          </div>
        )}
        
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-notes-${index}`} className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            id={`${idPrefix}-notes-${index}`}
            value={exercise.notes || ""}
            onChange={(e) => onUpdate(index, "notes", e.target.value)}
            placeholder="Focus on form, rest 60s"
            className="bg-background h-9"
          />
        </div>
      </div>

      {/* Personal Bests Dialog */}
      <Dialog open={pbDialogOpen} onOpenChange={setPbDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {exercise.name} - Personal Bests
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
                              {formatPBValue(entry)}
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

      {/* Workout History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {exercise.name} - Workout History
            </DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workout History */}
              {workoutHistory.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Previous Values</h3>
                  <p className="text-xs text-muted-foreground">Values set for this exercise in previous workouts</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {workoutHistory.map((entry, idx) => {
                      const entryDate = entry.completed_at || entry.workout_date
                      const hasBestSet = entry.bestSet && (entry.bestSet.reps || entry.bestSet.weight || entry.bestSet.seconds)
                      
                      const handleSelectHistory = () => {
                        // Auto-fill the form with these values
                        const updates: Partial<ExerciseFormData> = {}
                        
                        if (entry.sets) {
                          updates.sets = entry.sets
                        }
                        
                        // Handle reps vs seconds
                        if (entry.type === "reps" && entry.reps) {
                          updates.reps = entry.reps
                          updates.type = "reps"
                        } else if (entry.type === "seconds" && entry.seconds) {
                          updates.reps = entry.seconds
                          updates.type = "seconds"
                        } else if (entry.reps) {
                          // Fallback: if we have reps but no type specified, assume reps
                          updates.reps = entry.reps
                          updates.type = "reps"
                        }
                        
                        if (entry.weight) {
                          updates.weight = entry.weight
                        }
                        
                        if (entry.notes) {
                          updates.notes = entry.notes
                        }
                        
                        // Use batch update if available, otherwise update one by one
                        if (onUpdateMultiple) {
                          onUpdateMultiple(index, updates)
                          setHistoryDialogOpen(false)
                          toast.success("Workout values applied to form")
                        } else {
                          // Fallback: update fields one by one
                          Object.entries(updates).forEach(([field, value]) => {
                            onUpdate(index, field as keyof ExerciseFormData, value as string)
                          })
                          setTimeout(() => {
                            setHistoryDialogOpen(false)
                            toast.success("Workout values applied to form")
                          }, 100)
                        }
                      }
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={handleSelectHistory}
                          className="w-full text-left rounded border p-2.5 text-sm bg-card border-border hover:bg-accent hover:border-primary transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1">
                              {entry.workout_title && (
                                <p className="font-medium text-foreground text-xs mb-1">
                                  {entry.workout_title}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 text-xs">
                                {entry.sets && (
                                  <span className="text-muted-foreground">
                                    <span className="font-medium">Sets:</span> {entry.sets}
                                  </span>
                                )}
                                {entry.reps && entry.type === "reps" && (
                                  <span className="text-muted-foreground">
                                    <span className="font-medium">Reps:</span> {entry.reps}
                                  </span>
                                )}
                                {entry.seconds && entry.type === "seconds" && (
                                  <span className="text-muted-foreground">
                                    <span className="font-medium">Seconds:</span> {entry.seconds}
                                  </span>
                                )}
                                {entry.weight && (
                                  <span className="text-muted-foreground">
                                    <span className="font-medium">Weight:</span> {entry.weight}
                                  </span>
                                )}
                              </div>
                              {hasBestSet && (
                                <div className="mt-1 pt-1 border-t border-border">
                                  <span className="text-xs text-primary font-medium">Best Set: </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPBValue(entry.bestSet!)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                              {entryDate ? format(parseISO(entryDate), "MMM d, yyyy") : format(new Date(entry.workout_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <p className="text-xs text-primary mt-1">Click to apply these values</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    No workout history available
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

