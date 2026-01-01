"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { ClientHeader } from "@/components/client-header"
import { ArrowLeft, Trophy, TrendingUp, Calendar, Loader2, ExternalLink } from "lucide-react"
import Image from "next/image"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { normalizeExerciseName } from "@/lib/exercise-utils"

interface ExercisePB {
  id: string
  customer_id: string
  exercise_name: string
  reps?: string
  weight?: string
  seconds?: string
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
  completed_at?: string
}

// Helper function to format exercise name for display (capitalize first letter of each word)
function formatExerciseNameForDisplay(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function ExercisePage() {
  const params = useParams()
  const router = useRouter()
  const rawExerciseName = decodeURIComponent(params.exerciseName as string)
  // Normalize the exercise name for consistent matching
  const exerciseName = normalizeExerciseName(rawExerciseName)
  const displayName = formatExerciseNameForDisplay(exerciseName)
  
  const [loading, setLoading] = useState(true)
  const [pb, setPb] = useState<ExercisePB | null>(null)
  const [history, setHistory] = useState<PBHistoryEntry[]>([])
  const [exercise, setExercise] = useState<{ image_url?: string | null; video_url?: string | null } | null>(null)

  useEffect(() => {
    fetchExerciseData()
  }, [exerciseName])

  const fetchExerciseData = async () => {
    try {
      setLoading(true)
      const encodedName = encodeURIComponent(exerciseName)
      const response = await fetch(`/api/customer/exercises/${encodedName}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch exercise data")
      }

      const data = await response.json()
      setPb(data.pb)
      setHistory(data.history || [])
      setExercise(data.exercise || null)
    } catch (error) {
      console.error("Error fetching exercise data:", error)
      toast.error("Failed to load exercise data")
    } finally {
      setLoading(false)
    }
  }

  const formatPBValue = (entry: ExercisePB | PBHistoryEntry) => {
    const parts: string[] = []
    
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <ClientHeader />
      <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Personal Best Tracking
          </p>
        </div>
      </div>

      {/* Exercise Media */}
      {(exercise?.image_url || exercise?.video_url) && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Exercise Demonstration</h2>
          <div className="space-y-4">
            {exercise.image_url && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Image</Label>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={exercise.image_url}
                    alt={`${displayName} demonstration`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            )}
            {exercise.video_url && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Video</Label>
                <a
                  href={exercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Watch demonstration video
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Current PB */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Current Personal Best
            </h2>
            {pb ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-foreground">
                  {formatPBValue(pb)}
                </p>
                {pb.workout_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Set on {format(parseISO(pb.workout_date), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No personal best recorded yet. Complete an exercise with a best set to track your progress!
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* PB History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            PB History
          </h2>
          <Badge variant="secondary">
            {history.length} {history.length === 1 ? "entry" : "entries"}
          </Badge>
        </div>

        {history.length === 0 ? (
          <Card className="p-8 text-center bg-card/50">
            <p className="text-muted-foreground">
              No PB history yet. Complete exercises with best sets to see your progress over time.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => {
              const isCurrentPB = pb && entry.workout_id === pb.workout_id
              const entryDate = entry.completed_at || entry.workout_date
              
              return (
                <Card
                  key={`${entry.workout_id}-${index}`}
                  className={`p-5 transition-colors ${
                    isCurrentPB
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card/50 hover:bg-card/70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-lg font-semibold text-foreground">
                          {formatPBValue(entry)}
                        </p>
                        {isCurrentPB && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            Current PB
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(parseISO(entryDate), "MMMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="p-5 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Personal bests are automatically recorded when you complete an exercise 
          and enter a "Best Set" in the workout detail view. Your current PB is the most recent entry 
          for this exercise.
        </p>
      </Card>
      </div>
    </div>
  )
}

