"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ArrowLeft, Smile, Meh, Frown, TrendingUp, Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { WorkoutDetail, ExerciseCompletion } from "./workout-detail-view"

interface WorkoutSummaryViewProps {
  workout: WorkoutDetail
  onBack: () => void
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

export function WorkoutSummaryView({ workout, onBack }: WorkoutSummaryViewProps) {
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

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6 pb-20">
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
                {t("workouts.completed")}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {workout.title} • {format(workoutDate, "EEEE, MMMM d, yyyy")}
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
                <p className="text-sm text-muted-foreground">{t("workouts.completedOn")}</p>
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
                                {t("workouts.notCompleted")}
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
                              {t("workouts.completed")}: {format(parseISO(completion.completed_at), "MMM d, yyyy 'at' h:mm a")}
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
    </div>
  )
}

