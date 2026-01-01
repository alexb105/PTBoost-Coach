"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Plus, Loader2, Edit, Trash2, Dumbbell } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Exercise {
  id: string
  name: string
  display_name: string
  exercise_type?: "cardio" | "sets"
  default_sets?: number | null
  default_reps?: string | null
  default_weight?: string | null
  default_duration_minutes?: number | null
  default_distance_km?: number | null
  default_intensity?: string | null
  image_url?: string | null
  video_url?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

export default function ExercisesPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null)
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    exercise_type: "sets" as "cardio" | "sets",
    // Media
    image_url: "",
    video_url: "",
    description: "",
  })

  // Check admin session
  useEffect(() => {
    checkAdminSession()
    fetchExercises()
  }, [])

  const checkAdminSession = async () => {
    try {
      const response = await fetch("/api/auth/admin/check")
      if (!response.ok) {
        router.push("/auth/admin")
      }
    } catch (error) {
      router.push("/auth/admin")
    }
  }

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/exercises")
      
      if (!response.ok) {
        throw new Error("Failed to fetch exercises")
      }

      const data = await response.json()
      setExercises(data.exercises || [])
    } catch (error) {
      console.error("Error fetching exercises:", error)
      toast.error("Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingExercise
        ? `/api/admin/exercises/${editingExercise.id}`
        : "/api/admin/exercises"
      
      const method = editingExercise ? "PUT" : "POST"

      // Ensure exercise_type is always set and valid
      // Get the raw value and normalize it
      const rawType = exerciseForm.exercise_type
      console.log('Raw exercise_type from form:', rawType, typeof rawType)
      
      const exerciseType = (rawType && ['cardio', 'sets'].includes(String(rawType).trim().toLowerCase())) 
        ? String(rawType).trim().toLowerCase() 
        : 'sets'
      
      console.log('Normalized exercise_type:', exerciseType)

      if (!['cardio', 'sets'].includes(exerciseType)) {
        toast.error('Invalid exercise type: ' + exerciseType)
        return
      }

      const payload: any = {
        name: exerciseForm.name,
        display_name: exerciseForm.name,
        exercise_type: exerciseType,
      }

      console.log('Sending exercise payload:', JSON.stringify(payload, null, 2))

      // Add media URLs
      if (exerciseForm.image_url) payload.image_url = exerciseForm.image_url.trim() || null
      if (exerciseForm.video_url) payload.video_url = exerciseForm.video_url.trim() || null
      
      // Add description
      if (exerciseForm.description) payload.description = exerciseForm.description.trim() || null

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save exercise")
      }

      toast.success(editingExercise ? "Exercise updated successfully" : "Exercise created successfully")
      setIsDialogOpen(false)
      setEditingExercise(null)
      setExerciseForm({
        name: "",
        exercise_type: "sets",
        image_url: "",
        video_url: "",
        description: "",
      })
      fetchExercises()
    } catch (error: any) {
      console.error("Error saving exercise:", error)
      toast.error(error.message || "Failed to save exercise")
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setExerciseForm({
      name: exercise.display_name, // Show display name for editing
      exercise_type: exercise.exercise_type || "sets",
      image_url: exercise.image_url || "",
      video_url: exercise.video_url || "",
      description: exercise.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (exercise: Exercise) => {
    setExerciseToDelete(exercise)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!exerciseToDelete) return

    try {
      const response = await fetch(`/api/admin/exercises/${exerciseToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete exercise")
      }

      toast.success("Exercise deleted successfully")
      setDeleteDialogOpen(false)
      setExerciseToDelete(null)
      fetchExercises()
    } catch (error: any) {
      console.error("Error deleting exercise:", error)
      toast.error(error.message || "Failed to delete exercise")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingExercise(null)
    setExerciseForm({
      name: "",
      exercise_type: "sets",
      image_url: "",
      video_url: "",
      description: "",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Exercise Library</h1>
                <p className="text-xs text-muted-foreground">Manage global exercises</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
            >
              Back to Admin Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Exercises</h2>
            <p className="text-sm text-muted-foreground">
              Manage exercises that can be used across all clients. Each client has their own PB data.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open) {
              setEditingExercise(null)
    setExerciseForm({
      name: "",
      exercise_type: "sets",
                image_url: "",
                video_url: "",
                description: "",
    })
  }
            setIsDialogOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExercise ? "Edit Exercise" : "Add New Exercise"}
                </DialogTitle>
                <DialogDescription>
                  {editingExercise 
                    ? "Update the exercise name. This will be shared across all clients."
                    : "Create a new exercise that can be used across all clients."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveExercise} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Bench Press"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exercise_type">Exercise Type *</Label>
                  <Select
                    value={exerciseForm.exercise_type || "sets"}
                    onValueChange={(value: "cardio" | "sets") => 
                      setExerciseForm({ ...exerciseForm, exercise_type: value as "cardio" | "sets" })
                    }
                  >
                    <SelectTrigger id="exercise_type">
                      <SelectValue placeholder="Select exercise type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sets">Sets</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose whether this is a sets exercise (with sets/reps/weight) or cardio (with duration/distance).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL (Optional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={exerciseForm.image_url}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, image_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to an image demonstrating the exercise
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL (Optional)</Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={exerciseForm.video_url}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, video_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to a video demonstrating the exercise (YouTube, Vimeo, etc.)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter a detailed description of the exercise. This will be shown in the exercise info modal below the video."
                    value={exerciseForm.description}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Detailed description that will appear below the video in the exercise info modal
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingExercise ? "Update" : "Create"} Exercise
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Exercises Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No exercises yet</p>
                <Button onClick={() => {
                  setEditingExercise(null)
                  setExerciseForm({
                    name: "",
                    exercise_type: "sets",
                    image_url: "",
                    video_url: "",
                    description: "",
                  })
                  setIsDialogOpen(true)
                }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Exercise
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Normalized Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((exercise) => (
                    <TableRow key={exercise.id}>
                      <TableCell className="font-medium">
                        {exercise.display_name}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          exercise.exercise_type === "cardio" 
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        }`}>
                          {exercise.exercise_type === "cardio" ? "Cardio" : "Sets"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {exercise.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(exercise.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(exercise)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(exercise)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{exerciseToDelete?.display_name}"? 
              This action cannot be undone. If this exercise has personal best records, 
              you'll need to delete those first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

