"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WeekView, type Workout } from "@/components/week-view"
import { WorkoutDetailView, type WorkoutDetail } from "@/components/workout-detail-view"
import { ClientHeader } from "@/components/client-header"
import { Loader2 } from "lucide-react"
import { parseISO } from "date-fns"

export default function SessionsPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetail | null>(null)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/customer/workouts")
      
      if (response.status === 401) {
        // User is not authenticated, redirect to login
        router.push("/auth/login")
        return
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch workouts")
      }

      const data = await response.json()
      setWorkouts(data.workouts || [])
    } catch (error) {
      console.error("Error fetching workouts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (date: Date, workout?: Workout) => {
    if (workout) {
      setSelectedWorkout(workout as WorkoutDetail)
    }
  }

  const handleCompleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/complete`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark workout as complete")
      }

      // Refresh workouts to get updated completion status
      await fetchWorkouts()
      
      // Update selected workout if it's the one being completed
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        setSelectedWorkout({
          ...selectedWorkout,
          completed: true,
          completed_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error completing workout:", error)
      throw error
    }
  }

  const handleUncompleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/uncomplete`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark workout as incomplete")
      }

      // Refresh workouts to get updated completion status
      await fetchWorkouts()
      
      // Update selected workout if it's the one being uncompleted
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        setSelectedWorkout({
          ...selectedWorkout,
          completed: false,
          completed_at: undefined,
        })
      }
    } catch (error) {
      console.error("Error uncompleting workout:", error)
      throw error
    }
  }

  const handleExerciseComplete = async (workoutId: string, exerciseIndex: number, rating: "easy" | "good" | "hard" | "too_hard", bestSet?: { reps?: string; weight?: string; seconds?: string }) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/exercises/${exerciseIndex}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, bestSet }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete exercise")
      }

      const data = await response.json()
      
      // Update selected workout with new exercise completion
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        const updatedCompletions = selectedWorkout.exercise_completions || []
        const existingIndex = updatedCompletions.findIndex(ec => ec.exerciseIndex === exerciseIndex)
        
        const newCompletion = {
          exerciseIndex,
          completed: true,
          rating,
          completed_at: new Date().toISOString(),
          bestSet: bestSet && (bestSet.reps || bestSet.weight || bestSet.seconds) ? bestSet : undefined,
        }
        
        if (existingIndex >= 0) {
          updatedCompletions[existingIndex] = newCompletion
        } else {
          updatedCompletions.push(newCompletion)
        }
        
        const updatedWorkout = {
          ...selectedWorkout,
          exercise_completions: updatedCompletions,
        }
        setSelectedWorkout(updatedWorkout)
      }
      
      // Refresh workouts to get updated data
      await fetchWorkouts()
    } catch (error) {
      console.error("Error completing exercise:", error)
      throw error
    }
  }

  const handleExerciseUncomplete = async (workoutId: string, exerciseIndex: number) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/exercises/${exerciseIndex}/uncomplete`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to uncomplete exercise")
      }

      // Update selected workout to remove exercise completion
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        const updatedCompletions = (selectedWorkout.exercise_completions || []).filter(
          ec => ec.exerciseIndex !== exerciseIndex
        )
        
        const updatedWorkout = {
          ...selectedWorkout,
          exercise_completions: updatedCompletions,
        }
        setSelectedWorkout(updatedWorkout)
      }
      
      // Refresh workouts to get updated data
      await fetchWorkouts()
    } catch (error) {
      console.error("Error uncompleting exercise:", error)
      throw error
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  if (selectedWorkout) {
    return (
      <main className="min-h-screen pb-20">
        <ClientHeader />
        <WorkoutDetailView
          workout={selectedWorkout}
          onBack={() => setSelectedWorkout(null)}
          onComplete={handleCompleteWorkout}
          onUncomplete={handleUncompleteWorkout}
          onExerciseComplete={handleExerciseComplete}
          onExerciseUncomplete={handleExerciseUncomplete}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-20">
      <ClientHeader />
      <WeekView 
        workouts={workouts} 
        canEdit={false}
        onDayClick={handleDayClick}
      />
    </main>
  )
}
