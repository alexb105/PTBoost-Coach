"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User, Calendar, MessageCircle, Apple, Plus, Send, Loader2, X, Trash2, Pencil, BookOpen, Save, CheckCircle2, TrendingUp, Camera, Flame, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, Lock } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { WeekView, type Workout as WeekViewWorkout } from "@/components/week-view"
import { ExerciseFormItem, type ExerciseFormData } from "@/components/exercise-form-item"
import { WorkoutSummaryView } from "@/components/workout-summary-view"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMessageNotifications } from "@/hooks/use-message-notifications"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"

interface Customer {
  id: string
  email: string
  full_name?: string
  phone?: string
  created_at?: string
}

interface Workout {
  id: string
  customer_id: string
  title: string
  description: string
  date: string
  exercises?: string[]
  completed?: boolean
  completed_at?: string
  exercise_completions?: Array<{
    exerciseIndex: number
    completed: boolean
    rating?: "easy" | "good" | "hard" | "too_hard"
    completed_at?: string
  }>
  created_at: string
}

interface Message {
  id: string
  customer_id: string
  sender: "admin" | "customer"
  content: string
  created_at: string
}

interface NutritionTarget {
  id: string
  customer_id: string
  calories: number
  protein: number
  carbs: number
  fats: number
  suggestions?: string
}

interface WorkoutTemplate {
  id: string
  title: string
  description?: string
  exercises?: string[]
  created_at?: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t, language } = useLanguage()
  const customerId = params?.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const translatingRef = useRef<Set<string>>(new Set()) // Track messages currently being translated
  const translationQueueRef = useRef<Array<{ messageId: string; text: string }>>([])
  const isProcessingQueueRef = useRef<boolean>(false)
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null)
  const [meals, setMeals] = useState<any[]>([])
  const [mealsDate, setMealsDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [mealTemplates, setMealTemplates] = useState<any[]>([])
  const [editingMealTemplate, setEditingMealTemplate] = useState<any | null>(null)
  const [isMealTemplateDialogOpen, setIsMealTemplateDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [viewingTemplate, setViewingTemplate] = useState<any | null>(null)
  const [isViewTemplateDialogOpen, setIsViewTemplateDialogOpen] = useState(false)
  const [weightEntries, setWeightEntries] = useState<any[]>([])
  const [progressPhotos, setProgressPhotos] = useState<any[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("workouts")
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  
  // Meal management state
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<any | null>(null)
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null)
  const [isDeleteMealDialogOpen, setIsDeleteMealDialogOpen] = useState(false)
  const [mealForm, setMealForm] = useState({
    name: "",
    time: "",
    items: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  })
  const [showNutritionTracking, setShowNutritionTracking] = useState(false)
  
  // Customer details edit state
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false)
  const [isUpdatePasswordDialogOpen, setIsUpdatePasswordDialogOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  // Workout form state
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null)
  const [newWorkout, setNewWorkout] = useState<{
    title: string
    description: string
    date: string
    exercises: ExerciseFormData[]
  }>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    exercises: [],
  })

  // Helper function to parse exercise string into structured format
  const parseExercise = (exerciseStr: string): ExerciseFormData => {
    // Format: "Exercise Name 3x8 @ 50kg - Notes" or "Exercise Name 3x30s @ 50kg - Notes"
    if (!exerciseStr || !exerciseStr.trim()) {
      return { name: "", sets: "", reps: "", type: "reps", weight: "", notes: "" }
    }

    // Split by " - " to separate notes
    const parts = exerciseStr.split(" - ")
    const notes = parts.length > 1 ? parts[1].trim() : ""
    let mainPart = parts[0].trim()
    
    // Extract weight (format: @ weight)
    const weightMatch = mainPart.match(/@\s*([^-]+?)(?:\s*-\s*|$)/)
    let weight = ""
    if (weightMatch) {
      weight = weightMatch[1].trim()
      mainPart = mainPart.replace(/@\s*[^-]+?(\s*-\s*|$)/, "").trim()
    }
    
    // Extract sets and reps/seconds (format: 3x8 or 3x30s)
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
    
    // Remaining is the exercise name
    const name = mainPart.trim()
    
    return { name, sets, reps, type, weight, notes }
  }

  // Chat state
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const previousMessagesLengthRef = useRef<number>(0)
  
  // Message notifications
  const { unreadCount: chatUnreadCount, updateLastSeen, fetchUnreadCount } = useMessageNotifications({
    customerId,
    isAdmin: true,
    enabled: true, // Always enabled to show badge
    isViewingChat: activeTab === "chat", // Only suppress notifications when viewing chat
  })

  // Nutrition form state
  const [isNutritionDialogOpen, setIsNutritionDialogOpen] = useState(false)
  const [nutritionForm, setNutritionForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    suggestions: "", // This will be used for meal/ingredient suggestions
  })

  useEffect(() => {
    checkAdminSession()
    fetchCustomerData()
    fetchTemplates()
  }, [customerId])

  const translateMessage = async (messageId: string, text: string) => {
    // Don't translate if already translated
    if (translatedMessages[messageId]) {
      return translatedMessages[messageId]
    }

    // Don't translate if already being translated
    if (translatingRef.current.has(messageId)) {
      return text
    }

    // Don't translate empty or very short messages
    if (!text || text.trim().length < 2) {
      return text
    }

    // Always translate (even if target is English, we still need to translate foreign language messages)
    // Add to queue instead of translating immediately
    if (!translationQueueRef.current.find(item => item.messageId === messageId)) {
      translationQueueRef.current.push({ messageId, text })
    }

    // Process queue if not already processing
    if (!isProcessingQueueRef.current) {
      processTranslationQueue()
    }

    return text
  }

  const processTranslationQueue = async () => {
    if (isProcessingQueueRef.current || translationQueueRef.current.length === 0) {
      return
    }

    // Don't process if page is hidden
    if (typeof document === 'undefined' || document.hidden) {
      return
    }

    isProcessingQueueRef.current = true

    while (translationQueueRef.current.length > 0) {
      // Stop processing if page becomes hidden or document is unavailable
      if (typeof document === 'undefined' || document.hidden) {
        isProcessingQueueRef.current = false
        return
      }

      const item = translationQueueRef.current.shift()
      if (!item) break

      const { messageId, text } = item

      // Skip if already translated or currently translating
      if (translatedMessages[messageId] || translatingRef.current.has(messageId)) {
        continue
      }

      // Mark as being translated
      translatingRef.current.add(messageId)

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: language }),
        })

        if (response.ok) {
          const data = await response.json()
          const translated = data.translatedText || text
          // Always update translation state, even if same (to mark as processed)
          if (translated) {
            setTranslatedMessages(prev => ({ ...prev, [messageId]: translated }))
          }
        }
      } catch (error) {
        // Silently fail - just use original text
        console.debug("Translation failed for message, using original text:", error)
      } finally {
        // Remove from translating set
        translatingRef.current.delete(messageId)
      }

      // Add delay between requests to avoid rate limiting (500ms between each translation)
      if (translationQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    isProcessingQueueRef.current = false
  }

  // Poll for new messages when chat tab is active
  useEffect(() => {
    if (activeTab !== "chat") return

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/admin/customers/${customerId}/messages`)
        if (response.ok) {
          const data = await response.json()
          const fetchedMessages = data.messages || []
          
          // Sort messages by created_at timestamp (oldest first)
          const sortedMessages = [...fetchedMessages].sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          
          setMessages(sortedMessages)
          
          // Always translate messages (to user's selected language, even if it's English)
          setTimeout(() => {
            sortedMessages.forEach((message: Message) => {
              // Only translate if not already translated and not in queue
              if (!translatedMessages[message.id] && 
                  !translatingRef.current.has(message.id) &&
                  !translationQueueRef.current.find(item => item.messageId === message.id)) {
                translateMessage(message.id, message.content)
              }
            })
            // Ensure queue processing starts
            if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
              processTranslationQueue()
            }
          }, 100)
          
          // Update last seen timestamp to the most recent message
          if (sortedMessages.length > 0) {
            const lastMessage = sortedMessages[sortedMessages.length - 1]
            updateLastSeen(lastMessage.created_at)
            // Immediately refresh unread count to clear badge
            setTimeout(() => fetchUnreadCount(), 100)
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
      }
    }

    let isMounted = true

    const fetchMessagesSafe = async () => {
      if (isMounted && activeTab === "chat") {
        await fetchMessages()
      }
    }

    // Fetch immediately
    fetchMessagesSafe()

    // Poll every 10 seconds (reduced from 3s to reduce server load)
    const interval = setInterval(() => {
      // Only poll if page is visible and chat tab is active
      if (typeof document !== 'undefined' && !document.hidden && isMounted && activeTab === "chat") {
        fetchMessagesSafe()
      }
    }, 10000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [customerId, activeTab, updateLastSeen, fetchUnreadCount, language])

  // Re-translate messages when language changes
  useEffect(() => {
    if (messages.length > 0) {
      // Clear existing translations and re-translate when language changes
      setTranslatedMessages({})
      translationQueueRef.current = []
      translatingRef.current.clear()
      isProcessingQueueRef.current = false
      
      // Add all messages to queue with a delay to avoid rate limiting
      setTimeout(() => {
        messages.forEach((message) => {
          translateMessage(message.id, message.content)
        })
        // Ensure queue processing starts
        if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
          processTranslationQueue()
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Ensure new messages are translated when they arrive
  useEffect(() => {
    if (messages.length > 0 && activeTab === "chat") {
      // Check for untranslated messages (always translate, even to English)
      const untranslatedMessages = messages.filter(
        (message) =>
          !translatedMessages[message.id] &&
          !translatingRef.current.has(message.id) &&
          !translationQueueRef.current.find((item) => item.messageId === message.id)
      )

      if (untranslatedMessages.length > 0) {
        // Add untranslated messages to queue
        untranslatedMessages.forEach((message) => {
          translateMessage(message.id, message.content)
        })
        // Ensure queue processing starts
        if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
          processTranslationQueue()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, language, activeTab])

  // Mark messages as seen immediately when chat tab is opened
  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      updateLastSeen(lastMessage.created_at)
      // Immediately refresh unread count to clear badge
      fetchUnreadCount()
    }
  }, [activeTab, messages.length, updateLastSeen, fetchUnreadCount]) // Run when tab changes to chat or messages load

  // Check if user is at bottom of scroll container
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 150 // pixels from bottom
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isAtBottom = distanceFromBottom < threshold
    
    setIsUserAtBottom(isAtBottom)
    return isAtBottom
  }

  // Handle scroll events to track user position
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || activeTab !== "chat") return

    const handleScroll = () => {
      checkIfAtBottom()
    }

    // Also check when tab opens
    const timeoutId = setTimeout(() => {
      checkIfAtBottom()
    }, 100)

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [activeTab])

  // Auto-scroll to bottom only if user is already at bottom
  useEffect(() => {
    if (activeTab === "chat") {
      // Only auto-scroll if messages actually changed (new message added)
      const hasNewMessage = messages.length > previousMessagesLengthRef.current
      previousMessagesLengthRef.current = messages.length
      
      // Check scroll position right before deciding to scroll
      const shouldScroll = checkIfAtBottom()
      
      // Only auto-scroll if user is at the bottom AND there's a new message
      if (shouldScroll && messages.length > 0 && hasNewMessage) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        })
      }
      
      // Mark messages as seen when viewing chat
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        updateLastSeen(lastMessage.created_at)
        // Immediately refresh unread count to clear badge
        setTimeout(() => fetchUnreadCount(), 100)
      }
    }
  }, [messages, activeTab, updateLastSeen, fetchUnreadCount])

  // Auto-scroll to bottom when chat tab is first opened
  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
        setIsUserAtBottom(true)
      }, 100)
    }
  }, [activeTab]) // Only when tab changes

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/workout-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    }
  }

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

  const handleUpdateCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      })

      if (!response.ok) {
        throw new Error("Failed to update customer details")
      }

      toast.success("Customer details updated successfully")
      setIsEditCustomerDialogOpen(false)
      fetchCustomerData()
    } catch (error: any) {
      toast.error(error.message || "Failed to update customer details")
    }
  }

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/update-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      })

      if (!response.ok) {
        throw new Error("Failed to update password")
      }

      toast.success("Password updated successfully")
      setIsUpdatePasswordDialogOpen(false)
      setPasswordForm({ newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    }
  }

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      const [customerRes, workoutsRes, messagesRes, nutritionRes, mealsRes, progressRes] = await Promise.all([
        fetch(`/api/admin/customers/${customerId}`),
        fetch(`/api/admin/customers/${customerId}/workouts`),
        fetch(`/api/admin/customers/${customerId}/messages`),
        fetch(`/api/admin/customers/${customerId}/nutrition`),
        fetch(`/api/admin/customers/${customerId}/meals?date=${mealsDate}`),
        fetch(`/api/admin/customers/${customerId}/progress`),
      ])

      if (customerRes.ok) {
        const customerData = await customerRes.json()
        setCustomer(customerData.customer)
      }

      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json()
        setWorkouts(workoutsData.workouts || [])
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json()
        const fetchedMessages = messagesData.messages || []
        // Sort messages by created_at timestamp (oldest first)
        const sortedMessages = [...fetchedMessages].sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        setMessages(sortedMessages)
        
        // Always translate messages (to user's selected language, even if it's English)
        setTimeout(() => {
          sortedMessages.forEach((message: Message) => {
            if (!translatedMessages[message.id] && 
                !translatingRef.current.has(message.id) &&
                !translationQueueRef.current.find(item => item.messageId === message.id)) {
              translateMessage(message.id, message.content)
            }
          })
          // Ensure queue processing starts
          if (!isProcessingQueueRef.current && translationQueueRef.current.length > 0) {
            processTranslationQueue()
          }
        }, 100)
      }

      if (nutritionRes.ok) {
        const nutritionData = await nutritionRes.json()
        setNutritionTarget(nutritionData.target || null)
        if (nutritionData.target) {
          setNutritionForm({
            calories: nutritionData.target.calories.toString(),
            protein: nutritionData.target.protein.toString(),
            carbs: nutritionData.target.carbs.toString(),
            fats: nutritionData.target.fats.toString(),
            suggestions: nutritionData.target.suggestions || "",
          })
        }
      }

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json()
        setMeals(mealsData.meals || [])
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setWeightEntries(progressData.weightEntries || [])
        setProgressPhotos(progressData.progressPhotos || [])
      }
    } catch (error) {
      console.error("Error fetching customer data:", error)
      toast.error("Failed to load customer data")
    } finally {
      setLoading(false)
    }
  }

  const fetchMeals = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/meals?date=${mealsDate}`)
      if (response.ok) {
        const data = await response.json()
        setMeals(data.meals || [])
      }
    } catch (error) {
      console.error("Error fetching meals:", error)
    }
  }

  const fetchMealTemplates = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/meal-templates`)
      if (response.ok) {
        const data = await response.json()
        setMealTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error fetching meal templates:", error)
    }
  }

  const handleAddMeal = () => {
    setEditingMeal(null)
    setMealForm({
      name: "",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).slice(0, 5),
      items: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
    })
    setShowNutritionTracking(false)
    setIsMealDialogOpen(true)
  }

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal)
    setMealForm({
      name: meal.name,
      time: meal.time,
      items: meal.items.join("\n"),
      calories: meal.calories?.toString() || "",
      protein: meal.protein?.toString() || "",
      carbs: meal.carbs?.toString() || "",
      fats: meal.fats?.toString() || "",
    })
    setShowNutritionTracking(false)
    setIsMealDialogOpen(true)
  }

  const handleDeleteMeal = (mealId: string) => {
    setDeleteMealId(mealId)
    setIsDeleteMealDialogOpen(true)
  }

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mealForm.name.trim() || !mealForm.time) {
      toast.error("Please fill in meal name and time")
      return
    }

    try {
      const items = mealForm.items
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const mealData = {
        name: mealForm.name.trim(),
        date: mealsDate,
        time: mealForm.time,
        calories: mealForm.calories ? parseInt(mealForm.calories) : 0,
        protein: mealForm.protein ? parseInt(mealForm.protein) : 0,
        carbs: mealForm.carbs ? parseInt(mealForm.carbs) : 0,
        fats: mealForm.fats ? parseInt(mealForm.fats) : 0,
        items: items,
      }

      const url = editingMeal
        ? `/api/admin/customers/${customerId}/meals/${editingMeal.id}`
        : `/api/admin/customers/${customerId}/meals`
      
      const method = editingMeal ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mealData),
      })

      if (!response.ok) {
        throw new Error(editingMeal ? "Failed to update meal" : "Failed to add meal")
      }

      toast.success(editingMeal ? "Meal updated successfully" : "Meal added successfully")
      setIsMealDialogOpen(false)
      setEditingMeal(null)
      setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
      fetchMeals()
    } catch (error: any) {
      toast.error(error.message || "Failed to save meal")
    }
  }

  const handleConfirmDeleteMeal = async () => {
    if (!deleteMealId) return

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/meals/${deleteMealId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete meal")
      }

      toast.success("Meal deleted successfully")
      setIsDeleteMealDialogOpen(false)
      setDeleteMealId(null)
      fetchMeals()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete meal")
    }
  }

  const handleSaveMealTemplate = async () => {
    if (!mealForm.name.trim() || !mealForm.time) {
      toast.error("Please fill in meal name and time")
      return
    }

    try {
      const items = mealForm.items
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const templateData = {
        name: mealForm.name.trim(),
        time: mealForm.time,
        calories: mealForm.calories ? parseInt(mealForm.calories) : 0,
        protein: mealForm.protein ? parseInt(mealForm.protein) : 0,
        carbs: mealForm.carbs ? parseInt(mealForm.carbs) : 0,
        fats: mealForm.fats ? parseInt(mealForm.fats) : 0,
        items: items,
      }

      const response = await fetch(`/api/admin/customers/${customerId}/meal-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        throw new Error("Failed to save template")
      }

      toast.success("Meal template saved successfully")
      fetchMealTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to save template")
    }
  }

  const handleUseTemplate = (template: any) => {
    setMealForm({
      name: template.name,
      time: template.time,
      items: template.items.join("\n"),
      calories: template.calories?.toString() || "",
      protein: template.protein?.toString() || "",
      carbs: template.carbs?.toString() || "",
      fats: template.fats?.toString() || "",
    })
    const hasNutritionData = (template.calories && template.calories > 0) || 
                             (template.protein && template.protein > 0) || 
                             (template.carbs && template.carbs > 0) || 
                             (template.fats && template.fats > 0)
    setShowNutritionTracking(hasNutritionData)
    if (!isMealDialogOpen) {
      setIsMealDialogOpen(true)
    }
  }

  const handleViewTemplate = (template: any) => {
    setViewingTemplate(template)
    setIsViewTemplateDialogOpen(true)
  }

  const handleCreateTemplate = () => {
    setEditingMealTemplate(null)
    setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
    setShowNutritionTracking(false)
    setIsMealTemplateDialogOpen(true)
  }

  const handleEditMealTemplate = (template: any) => {
    setEditingMealTemplate(template)
    setMealForm({
      name: template.name,
      time: template.time,
      items: template.items.join("\n"),
      calories: template.calories?.toString() || "",
      protein: template.protein?.toString() || "",
      carbs: template.carbs?.toString() || "",
      fats: template.fats?.toString() || "",
    })
    const hasNutritionData = (template.calories && template.calories > 0) || 
                             (template.protein && template.protein > 0) || 
                             (template.carbs && template.carbs > 0) || 
                             (template.fats && template.fats > 0)
    setShowNutritionTracking(hasNutritionData)
    setIsMealTemplateDialogOpen(true)
  }

  const handleSaveMealTemplateEdit = async () => {
    if (!mealForm.name.trim() || !mealForm.time) {
      toast.error("Please fill in meal name and time")
      return
    }

    if (!editingMealTemplate) return

    try {
      const items = mealForm.items
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const templateData = {
        name: mealForm.name.trim(),
        time: mealForm.time,
        calories: mealForm.calories ? parseInt(mealForm.calories) : 0,
        protein: mealForm.protein ? parseInt(mealForm.protein) : 0,
        carbs: mealForm.carbs ? parseInt(mealForm.carbs) : 0,
        fats: mealForm.fats ? parseInt(mealForm.fats) : 0,
        items: items,
      }

      const response = await fetch(`/api/admin/customers/${customerId}/meal-templates/${editingMealTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        throw new Error("Failed to update template")
      }

      toast.success("Meal template updated successfully")
      setIsMealTemplateDialogOpen(false)
      setEditingMealTemplate(null)
      setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
      fetchMealTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to update template")
    }
  }

  const handleDeleteMealTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/meal-templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast.success("Meal template deleted successfully")
      fetchMealTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template")
    }
  }

  useEffect(() => {
    if (activeTab === "nutrition") {
      fetchMeals()
      fetchMealTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealsDate, activeTab, customerId])

  const handleDayClick = (date: Date, workout?: Workout) => {
    if (workout) {
      // If workout is completed, show summary view
      if (workout.completed) {
        setSummaryWorkout(workout)
        return
      }
      
      // Otherwise, edit existing workout
      setEditingWorkout(workout)
      setSelectedDate(new Date(workout.date))
      
      // Parse exercises from stored format
      const parsedExercises = workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0
        ? workout.exercises.map(parseExercise)
        : [{ name: "", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }]
      
      setNewWorkout({
        title: workout.title,
        description: workout.description || "",
        date: workout.date,
        exercises: parsedExercises,
      })
      setIsWorkoutDialogOpen(true)
    } else {
      // Create new workout
      setEditingWorkout(null)
      setSelectedDate(date)
      setNewWorkout({
        title: "",
        description: "",
        date: format(date, "yyyy-MM-dd"),
        exercises: [{ name: "", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
      })
      setIsWorkoutDialogOpen(true)
    }
  }

  const handleDeleteClick = (workoutId: string) => {
    setDeleteWorkoutId(workoutId)
    setIsDeleteDialogOpen(true)
  }

  const addExercise = () => {
    setNewWorkout({
      ...newWorkout,
      exercises: [...newWorkout.exercises, { name: "", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
    })
  }

  const removeExercise = (index: number) => {
    setNewWorkout({
      ...newWorkout,
      exercises: newWorkout.exercises.filter((_, i) => i !== index),
    })
  }

  const updateExercise = (index: number, field: keyof ExerciseFormData, value: string) => {
    const updatedExercises = [...newWorkout.exercises]
    updatedExercises[index] = { ...updatedExercises[index], [field]: value }
    setNewWorkout({ ...newWorkout, exercises: updatedExercises })
  }

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Format exercises as strings for storage
      const formattedExercises = newWorkout.exercises
        .filter((ex) => ex.name && ex.name.trim())
        .map((ex) => {
          let exerciseStr = ex.name.trim()
          if (ex.sets && ex.reps) {
            exerciseStr += ` ${ex.sets}x${ex.reps}${ex.type === "seconds" ? "s" : ""}`
          }
          if (ex.weight && ex.weight.trim()) {
            exerciseStr += ` @ ${ex.weight.trim()}`
          }
          if (ex.notes && ex.notes.trim()) {
            exerciseStr += ` - ${ex.notes.trim()}`
          }
          return exerciseStr
        })

      console.log("Saving workout with exercises:", formattedExercises)
      console.log("Raw exercises data:", newWorkout.exercises)

      const url = editingWorkout
        ? `/api/admin/customers/${customerId}/workouts/${editingWorkout.id}`
        : `/api/admin/customers/${customerId}/workouts`
      
      const method = editingWorkout ? "PUT" : "POST"

      const requestBody = {
        title: newWorkout.title,
        description: newWorkout.description || null,
        date: newWorkout.date,
        exercises: formattedExercises,
      }

      console.log("Request body:", requestBody)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(editingWorkout ? "Failed to update workout" : "Failed to add workout")
      }

      toast.success(editingWorkout ? "Workout updated successfully" : "Workout added successfully")
      setIsWorkoutDialogOpen(false)
      setEditingWorkout(null)
      setSelectedDate(null)
      setNewWorkout({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        exercises: [{ name: "", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
      })
      fetchCustomerData()
    } catch (error: any) {
      toast.error(error.message || "Failed to save workout")
    }
  }

  const handleDeleteWorkout = async () => {
    if (!deleteWorkoutId) return

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/workouts/${deleteWorkoutId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete workout")
      }

      toast.success("Workout deleted successfully")
      setIsDeleteDialogOpen(false)
      setDeleteWorkoutId(null)
      fetchCustomerData()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete workout")
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name")
      return
    }

    try {
      // Format exercises as strings for storage
      const formattedExercises = newWorkout.exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => {
          let exerciseStr = ex.name
          if (ex.sets && ex.reps) {
            exerciseStr += ` ${ex.sets}x${ex.reps}`
          }
          if (ex.weight) {
            exerciseStr += ` @ ${ex.weight}`
          }
          if (ex.notes) {
            exerciseStr += ` - ${ex.notes}`
          }
          return exerciseStr
        })

      const response = await fetch("/api/admin/workout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateName,
          description: newWorkout.description,
          exercises: formattedExercises,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save template")
      }

      toast.success("Template saved successfully")
      setIsSaveTemplateDialogOpen(false)
      setTemplateName("")
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to save template")
    }
  }

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    // Parse exercises from template
    const parsedExercises = template.exercises && Array.isArray(template.exercises) && template.exercises.length > 0
      ? template.exercises.map(parseExercise)
      : [{ name: "", sets: "", reps: "", weight: "", notes: "" }]

    setNewWorkout({
      title: template.title,
      description: template.description || "",
      date: newWorkout.date, // Keep the selected date
      exercises: parsedExercises,
    })

    toast.success("Template loaded")
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/workout-templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast.success("Template deleted successfully")
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template")
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setNewMessage("")
      fetchCustomerData()
    } catch (error: any) {
      toast.error(error.message || "Failed to send message")
    }
  }

  const handleSaveNutrition = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: parseInt(nutritionForm.calories),
          protein: parseInt(nutritionForm.protein),
          carbs: parseInt(nutritionForm.carbs),
          fats: parseInt(nutritionForm.fats),
          suggestions: nutritionForm.suggestions,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save nutrition targets")
      }

      toast.success("Nutrition targets updated successfully")
      setIsNutritionDialogOpen(false)
      fetchCustomerData()
    } catch (error: any) {
      toast.error(error.message || "Failed to save nutrition targets")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {customer.full_name?.[0]?.toUpperCase() || customer.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">{customer.full_name || "Customer"}</h1>
                <p className="text-xs text-muted-foreground">{customer.email}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomerForm({
                      full_name: customer.full_name || "",
                      phone: customer.phone || "",
                      email: customer.email || "",
                    })
                    setIsEditCustomerDialogOpen(true)
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {t("admin.editDetails")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUpdatePasswordDialogOpen(true)}
                >
                  <Lock className="mr-1 h-4 w-4" />
                  {t("admin.updatePassword")}
                </Button>
              </div>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Workout Summary View */}
      {summaryWorkout && (
        <main className="container mx-auto px-4 py-8">
          <WorkoutSummaryView
            workout={summaryWorkout}
            onBack={() => setSummaryWorkout(null)}
          />
        </main>
      )}

      {/* Main Content */}
      {!summaryWorkout && (
        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="workouts" className="gap-2">
              <Calendar className="h-4 w-4" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2 relative">
              <div className="relative">
                <MessageCircle className="h-4 w-4" />
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </div>
              Chat
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-2">
              <Apple className="h-4 w-4" />
              Nutrition
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-4">
            <WeekView 
              workouts={workouts} 
              canEdit={true} 
              onDayClick={(date, workout) => handleDayClick(date, workout)} 
            />

            <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle>{editingWorkout ? "Edit Workout" : "Add New Workout"}</DialogTitle>
                      <DialogDescription>
                        {selectedDate
                          ? `${editingWorkout ? "Edit" : "Create"} a workout for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`
                          : `${editingWorkout ? "Edit" : "Create"} a workout plan for this customer`}
                      </DialogDescription>
                    </div>
                    {editingWorkout?.completed && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-3 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
                <form onSubmit={handleSaveWorkout} className="space-y-6">
                  {/* Template Selection */}
                  {!editingWorkout && templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Load from Template (optional)</Label>
                      <Select onValueChange={handleLoadTemplate}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a template to load..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Workout Information Section */}
                  <Card className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Workout Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Workout Title *</Label>
                          <Input
                            id="title"
                            value={newWorkout.title}
                            onChange={(e) => setNewWorkout({ ...newWorkout, title: e.target.value })}
                            placeholder="e.g., Upper Body Strength"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Date *</Label>
                          <Input
                            id="date"
                            type="date"
                            value={newWorkout.date}
                            onChange={(e) => setNewWorkout({ ...newWorkout, date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description & Notes</Label>
                        <Textarea
                          id="description"
                          value={newWorkout.description}
                          onChange={(e) => setNewWorkout({ ...newWorkout, description: e.target.value })}
                          placeholder="Workout description, warm-up notes, or general instructions..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Exercises Section */}
                  <Card className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Plus className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Exercises</h3>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addExercise}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Exercise
                        </Button>
                      </div>

                      {newWorkout.exercises.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                          <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">No exercises added yet</p>
                          <Button type="button" variant="outline" onClick={addExercise} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add First Exercise
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {newWorkout.exercises.map((exercise, index) => (
                            <ExerciseFormItem
                              key={index}
                              exercise={exercise}
                              index={index}
                              onUpdate={updateExercise}
                              onRemove={removeExercise}
                              canRemove={newWorkout.exercises.length > 1}
                              idPrefix="exercise"
                              customerId={customerId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      {editingWorkout && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleDeleteClick(editingWorkout.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                      {!editingWorkout && newWorkout.exercises.some((e) => e.name.trim()) && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsSaveTemplateDialogOpen(true)}
                          className="gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Save as Template
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 ml-auto">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsWorkoutDialogOpen(false)
                        setEditingWorkout(null)
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!newWorkout.title || newWorkout.exercises.every((e) => !e.name.trim())}>
                        {editingWorkout ? "Update Workout" : "Create Workout"}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the workout.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteWorkout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Save Template Dialog */}
            <Dialog open={isSaveTemplateDialogOpen} onOpenChange={setIsSaveTemplateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save as Template</DialogTitle>
                  <DialogDescription>
                    Save this workout as a template to reuse it later
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Upper Body Strength"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsSaveTemplateDialogOpen(false)
                      setTemplateName("")
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>
                      Save Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Templates List */}
            {templates.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Workout Templates
                  </CardTitle>
                  <CardDescription>Saved templates for quick access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{template.title}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                          {template.exercises && template.exercises.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadTemplate(template.id)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Use
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMealTemplate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex flex-col h-[600px]">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Chat with {customer.full_name || customer.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4" ref={messagesContainerRef}>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[80%] gap-2 ${message.sender === "admin" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div className="space-y-1">
                            <Card
                              className={`p-3 ${
                                message.sender === "admin" ? "bg-primary text-primary-foreground" : "bg-card"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">
                                {translatedMessages[message.id] || message.content}
                              </p>
                            </Card>
                            <p
                              className={`text-xs text-muted-foreground ${message.sender === "admin" ? "text-right" : "text-left"}`}
                            >
                              {new Date(message.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{t("admin.nutritionTargets")}</h2>
                <p className="text-sm text-muted-foreground">{t("admin.setDailyGoals")}</p>
              </div>
              <Dialog open={isNutritionDialogOpen} onOpenChange={setIsNutritionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {nutritionTarget ? t("admin.updateTargets") : t("admin.setTargets")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{nutritionTarget ? t("admin.updateDailyTargets") : t("admin.setDailyTargets")}</DialogTitle>
                    <DialogDescription>
                      {t("admin.setCalorieMacroTargets")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveNutrition} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="calories">{t("nutrition.calories")} ({t("nutrition.kcal")})</Label>
                        <Input
                          id="calories"
                          type="number"
                          value={nutritionForm.calories}
                          onChange={(e) => setNutritionForm({ ...nutritionForm, calories: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="protein">{t("nutrition.protein")} ({t("nutrition.g")})</Label>
                        <Input
                          id="protein"
                          type="number"
                          value={nutritionForm.protein}
                          onChange={(e) => setNutritionForm({ ...nutritionForm, protein: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carbs">{t("nutrition.carbs")} ({t("nutrition.g")})</Label>
                        <Input
                          id="carbs"
                          type="number"
                          value={nutritionForm.carbs}
                          onChange={(e) => setNutritionForm({ ...nutritionForm, carbs: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fats">{t("nutrition.fats")} ({t("nutrition.g")})</Label>
                        <Input
                          id="fats"
                          type="number"
                          value={nutritionForm.fats}
                          onChange={(e) => setNutritionForm({ ...nutritionForm, fats: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggestions">{t("nutrition.suggestions")}</Label>
                      <Textarea
                        id="suggestions"
                        value={nutritionForm.suggestions}
                        onChange={(e) => setNutritionForm({ ...nutritionForm, suggestions: e.target.value })}
                        placeholder={t("admin.suggestMeals")}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("admin.listMeals")}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsNutritionDialogOpen(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button type="submit">{t("admin.saveTargets")}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {nutritionTarget ? (
              <div className="space-y-4">
                {/* Daily Targets Card */}
                <Card className="bg-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Apple className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Daily Targets</h2>
                      <p className="text-sm text-muted-foreground">Set for this client</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Calories</p>
                      <p className="text-lg font-semibold text-foreground">{nutritionTarget.calories} kcal</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Protein</p>
                      <p className="text-lg font-semibold text-foreground">{nutritionTarget.protein} g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Carbs</p>
                      <p className="text-lg font-semibold text-foreground">{nutritionTarget.carbs} g</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fats</p>
                      <p className="text-lg font-semibold text-foreground">{nutritionTarget.fats} g</p>
                    </div>
                  </div>
                </Card>

                {/* Suggestions Card */}
                {nutritionTarget.suggestions && (
                  <Card className="bg-primary/5 border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                      <Apple className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">Suggestions</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {nutritionTarget.suggestions}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Calculate totals from meals for selected date */}
                {(() => {
                  const totalCalories = meals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0)
                  const totalProtein = meals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0)
                  const totalCarbs = meals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0)
                  const totalFats = meals.reduce((sum: number, meal: any) => sum + (meal.fats || 0), 0)
                  
                  const getProgressValue = (current: number, goal: number): number => {
                    if (goal === 0) return 0
                    const percentage = (current / goal) * 100
                    return Math.min(percentage, 100)
                  }

                  const exceedsGoal = (current: number, goal: number): boolean => {
                    return current > goal
                  }

                  const isToday = mealsDate === new Date().toISOString().split('T')[0]
                  const selectedDateFormatted = format(new Date(mealsDate), "MMM d, yyyy")

                  return (
                    <>
                      {/* Calorie Overview - Only show if there are meals with calories */}
                      {totalCalories > 0 && (
                        <Card className="bg-card p-6">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              <Flame className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-foreground">{totalCalories}</span>
                                <span className="text-muted-foreground">/ {nutritionTarget.calories} kcal</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {totalCalories > nutritionTarget.calories 
                                  ? `${totalCalories - nutritionTarget.calories} calories over goal`
                                  : `${nutritionTarget.calories - totalCalories} calories remaining`}
                              </p>
                            </div>
                          </div>
                          <Progress value={getProgressValue(totalCalories, nutritionTarget.calories)} className="h-2" />
                        </Card>
                      )}

                      {/* Macros - Only show if there are meals with macro data */}
                      {(totalProtein > 0 || totalCarbs > 0 || totalFats > 0) && (
                        <Card className="bg-card p-6">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Apple className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h2 className="font-semibold text-foreground">Macronutrients</h2>
                                <p className="text-sm text-muted-foreground">{isToday ? "Today's" : selectedDateFormatted + "'s"} progress</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {[
                              { name: "Protein", current: totalProtein, goal: nutritionTarget.protein, color: "bg-primary" },
                              { name: "Carbs", current: totalCarbs, goal: nutritionTarget.carbs, color: "bg-chart-2" },
                              { name: "Fats", current: totalFats, goal: nutritionTarget.fats, color: "bg-chart-4" },
                            ].map((macro, index) => {
                              const isOverGoal = exceedsGoal(macro.current, macro.goal)
                              return (
                                <div key={index} className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">{macro.name}</span>
                                    <span className={isOverGoal ? "text-destructive font-medium" : "text-muted-foreground"}>
                                      {macro.current} / {macro.goal} g
                                      {isOverGoal && " ⚠️"}
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <Progress value={getProgressValue(macro.current, macro.goal)} className="h-2" />
                                    {isOverGoal && (
                                      <div className="absolute inset-0 flex items-center justify-end pr-1">
                                        <span className="text-[10px] text-destructive font-bold">Over goal</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </Card>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Apple className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No nutrition targets set</p>
                  <Button onClick={() => setIsNutritionDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Set Nutrition Targets
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Client Meals */}
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">
                    {mealsDate === new Date().toISOString().split('T')[0] ? "Today's Meals" : `Meals - ${format(new Date(mealsDate), "MMM d, yyyy")}`}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const date = new Date(mealsDate)
                        date.setDate(date.getDate() - 1)
                        setMealsDate(date.toISOString().split('T')[0])
                      }}
                      className="h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="date"
                      value={mealsDate}
                      onChange={(e) => setMealsDate(e.target.value)}
                      className="w-auto"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const date = new Date(mealsDate)
                        date.setDate(date.getDate() + 1)
                        setMealsDate(date.toISOString().split('T')[0])
                      }}
                      disabled={mealsDate >= new Date().toISOString().split('T')[0]}
                      className="h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsTemplatesModalOpen(true)}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("templates.title")}
                  </Button>
                  <Button onClick={handleAddMeal} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("admin.addMeal")}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {meals.length === 0 ? (
                  <Card className="bg-card p-8 text-center">
                    <p className="text-muted-foreground">No meals logged for this date.</p>
                  </Card>
                ) : (
                  meals.map((meal) => {
                    const formatTime = (time: string): string => {
                      try {
                        const [hours, minutes] = time.split(":")
                        const hour = parseInt(hours)
                        const ampm = hour >= 12 ? "PM" : "AM"
                        const displayHour = hour % 12 || 12
                        return `${displayHour}:${minutes} ${ampm}`
                      } catch {
                        return time
                      }
                    }

                    return (
                      <Card key={meal.id} className="bg-card p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{meal.name}</h3>
                            <p className="text-xs text-muted-foreground">{formatTime(meal.time)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {meal.calories > 0 && (
                              <div className="text-right">
                                <p className="font-semibold text-foreground">{meal.calories}</p>
                                <p className="text-xs text-muted-foreground">kcal</p>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditMeal(meal)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {meal.items && meal.items.length > 0 && (
                          <ul className="space-y-1">
                            {meal.items.map((item: string, itemIndex: number) => (
                              <li key={itemIndex} className="text-sm text-muted-foreground">
                                • {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {(meal.protein > 0 || meal.carbs > 0 || meal.fats > 0) && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              {meal.protein > 0 && <span>Protein: {meal.protein}g</span>}
                              {meal.carbs > 0 && <span>Carbs: {meal.carbs}g</span>}
                              {meal.fats > 0 && <span>Fats: {meal.fats}g</span>}
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Progress Tracking</h2>
              <p className="text-sm text-muted-foreground">View client's weight entries and progress photos</p>
            </div>

            {/* Weight Tracking Section */}
            <Card className="bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Weight Log</h3>
                  <p className="text-sm text-muted-foreground">Weight entries over time</p>
                </div>
              </div>

              <div className="space-y-3">
                {weightEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No weight entries logged yet.</p>
                ) : (
                  weightEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </span>
                      <span className="font-semibold text-foreground">{entry.weight} lbs</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Progress Photos Section */}
            <Card className="bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t("progress.progressPhotos")}</h3>
                  <p className="text-sm text-muted-foreground">{t("progress.visualProgress")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {progressPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 col-span-2">No progress photos uploaded yet.</p>
                ) : (
                  progressPhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-background">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={`Progress photo from ${format(new Date(photo.date), "MMM d, yyyy")}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Camera className="h-8 w-8 text-muted-foreground" />
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
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Meal Dialog */}
        <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMeal ? "Edit Meal" : "Add Meal"}</DialogTitle>
              <DialogDescription>
                {editingMeal ? "Update meal details" : "Add a new meal for this customer"}
              </DialogDescription>
            </DialogHeader>
            {!editingMeal && mealTemplates.length > 0 && (
              <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
                <Label className="text-sm font-medium mb-2 block">Load from Template</Label>
                <div className="flex flex-wrap gap-2">
                  {mealTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="text-xs"
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleSaveMeal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-meal-name">Meal Name *</Label>
                <Input
                  id="admin-meal-name"
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                  placeholder="e.g., Breakfast, Lunch, Dinner"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-meal-time">Time *</Label>
                <Input
                  id="admin-meal-time"
                  type="time"
                  value={mealForm.time}
                  onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-meal-items">What did they eat? (one item per line)</Label>
                <Textarea
                  id="admin-meal-items"
                  value={mealForm.items}
                  onChange={(e) => setMealForm({ ...mealForm, items: e.target.value })}
                  placeholder="Oatmeal with berries&#10;2 eggs&#10;Black coffee"
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNutritionTracking(!showNutritionTracking)}
                  className="w-full justify-between"
                >
                  <span className="text-sm font-medium">
                    {showNutritionTracking ? "Hide" : "Show"} Nutrition Tracking (Optional)
                  </span>
                  {showNutritionTracking ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                {showNutritionTracking && (
                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-meal-calories" className="text-xs">Calories (kcal)</Label>
                        <Input
                          id="admin-meal-calories"
                          type="number"
                          min="0"
                          value={mealForm.calories}
                          onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-meal-protein" className="text-xs">Protein (g)</Label>
                        <Input
                          id="admin-meal-protein"
                          type="number"
                          min="0"
                          value={mealForm.protein}
                          onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-meal-carbs" className="text-xs">Carbs (g)</Label>
                        <Input
                          id="admin-meal-carbs"
                          type="number"
                          min="0"
                          value={mealForm.carbs}
                          onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-meal-fats" className="text-xs">Fats (g)</Label>
                        <Input
                          id="admin-meal-fats"
                          type="number"
                          min="0"
                          value={mealForm.fats}
                          onChange={(e) => setMealForm({ ...mealForm, fats: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMealDialogOpen(false)
                    setEditingMeal(null)
                    setShowNutritionTracking(false)
                    setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    handleSaveMealTemplate()
                  }}
                  disabled={!mealForm.name.trim() || !mealForm.time}
                >
                  Save as Template
                </Button>
                <Button type="submit">
                  {editingMeal ? "Update Meal" : "Add Meal"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Meal Confirmation Dialog */}
        <AlertDialog open={isDeleteMealDialogOpen} onOpenChange={setIsDeleteMealDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this meal. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteMealId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteMeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Meal Templates Management Modal */}
        <Dialog open={isTemplatesModalOpen} onOpenChange={setIsTemplatesModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meal Templates</DialogTitle>
              <DialogDescription>
                Manage meal templates for quick meal logging
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-end">
              <Button onClick={handleCreateTemplate} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {t("templates.createTemplate")}
              </Button>
            </div>
            {mealTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("templates.noTemplates")}</p>
                <p className="text-sm mt-1">{t("templates.createFirst")}</p>
              </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mealTemplates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{template.time}</p>
                          {template.items && template.items.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1">Items:</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {template.items.slice(0, 3).map((item: string, idx: number) => (
                                  <li key={idx}>• {item}</li>
                                ))}
                                {template.items.length > 3 && (
                                  <li className="text-muted-foreground/70">+{template.items.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                          {(template.calories > 0 || template.protein > 0 || template.carbs > 0 || template.fats > 0) && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                {template.calories > 0 && <span>{template.calories} kcal</span>}
                                {template.protein > 0 && <span>P: {template.protein}g</span>}
                                {template.carbs > 0 && <span>C: {template.carbs}g</span>}
                                {template.fats > 0 && <span>F: {template.fats}g</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleUseTemplate(template)
                            setIsTemplatesModalOpen(false)
                          }}
                          className="flex-1"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Use
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTemplate(template)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEditMealTemplate(template)
                            setIsTemplatesModalOpen(false)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMealTemplate(template.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Template Dialog */}
        <Dialog open={isViewTemplateDialogOpen} onOpenChange={setIsViewTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingTemplate?.name}</DialogTitle>
              <DialogDescription>
                Template details
              </DialogDescription>
            </DialogHeader>
            {viewingTemplate && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <p className="text-sm text-muted-foreground mt-1">{viewingTemplate.time}</p>
                </div>
                {viewingTemplate.items && viewingTemplate.items.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Items</Label>
                    <ul className="mt-1 space-y-1">
                      {viewingTemplate.items.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(viewingTemplate.calories > 0 || viewingTemplate.protein > 0 || viewingTemplate.carbs > 0 || viewingTemplate.fats > 0) && (
                  <div>
                    <Label className="text-sm font-medium">Nutrition</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      {viewingTemplate.calories > 0 && (
                        <div className="text-muted-foreground">Calories: {viewingTemplate.calories} kcal</div>
                      )}
                      {viewingTemplate.protein > 0 && (
                        <div className="text-muted-foreground">Protein: {viewingTemplate.protein}g</div>
                      )}
                      {viewingTemplate.carbs > 0 && (
                        <div className="text-muted-foreground">Carbs: {viewingTemplate.carbs}g</div>
                      )}
                      {viewingTemplate.fats > 0 && (
                        <div className="text-muted-foreground">Fats: {viewingTemplate.fats}g</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewTemplateDialogOpen(false)
                      setViewingTemplate(null)
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleUseTemplate(viewingTemplate)
                      setIsViewTemplateDialogOpen(false)
                      setIsTemplatesModalOpen(false)
                    }}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Meal Template Dialog */}
        <Dialog open={isMealTemplateDialogOpen} onOpenChange={setIsMealTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Meal Template</DialogTitle>
              <DialogDescription>
                Update this meal template
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveMealTemplateEdit(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-meal-name">Meal Name *</Label>
                <Input
                  id="template-meal-name"
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                  placeholder="e.g., Breakfast, Lunch, Dinner"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-meal-time">Time *</Label>
                <Input
                  id="template-meal-time"
                  type="time"
                  value={mealForm.time}
                  onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-meal-items">What did they eat? (one item per line)</Label>
                <Textarea
                  id="template-meal-items"
                  value={mealForm.items}
                  onChange={(e) => setMealForm({ ...mealForm, items: e.target.value })}
                  placeholder="Oatmeal with berries&#10;2 eggs&#10;Black coffee"
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNutritionTracking(!showNutritionTracking)}
                  className="w-full justify-between"
                >
                  <span className="text-sm font-medium">
                    {showNutritionTracking ? "Hide" : "Show"} Nutrition Tracking (Optional)
                  </span>
                  {showNutritionTracking ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                {showNutritionTracking && (
                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-meal-calories" className="text-xs">Calories (kcal)</Label>
                        <Input
                          id="template-meal-calories"
                          type="number"
                          min="0"
                          value={mealForm.calories}
                          onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-meal-protein" className="text-xs">Protein (g)</Label>
                        <Input
                          id="template-meal-protein"
                          type="number"
                          min="0"
                          value={mealForm.protein}
                          onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-meal-carbs" className="text-xs">Carbs (g)</Label>
                        <Input
                          id="template-meal-carbs"
                          type="number"
                          min="0"
                          value={mealForm.carbs}
                          onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-meal-fats" className="text-xs">Fats (g)</Label>
                        <Input
                          id="template-meal-fats"
                          type="number"
                          min="0"
                          value={mealForm.fats}
                          onChange={(e) => setMealForm({ ...mealForm, fats: e.target.value })}
                          placeholder="Optional"
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMealTemplateDialogOpen(false)
                    setEditingMealTemplate(null)
                    setShowNutritionTracking(false)
                    setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {t("common.update")} {t("templates.title").slice(0, -1)}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Details Dialog */}
        <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer Details</DialogTitle>
              <DialogDescription>
                Update customer information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomerDetails(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-full-name">Full Name</Label>
                <Input
                  id="customer-full-name"
                  value={customerForm.full_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditCustomerDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Password Dialog */}
        <Dialog open={isUpdatePasswordDialogOpen} onOpenChange={setIsUpdatePasswordDialogOpen}>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.updatePassword")}</DialogTitle>
            <DialogDescription>
              {t("admin.updatePassword")}
            </DialogDescription>
          </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("profile.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder={t("profile.newPassword")}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  {t("profile.updatePassword")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("profile.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder={t("profile.confirmPassword")}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUpdatePasswordDialogOpen(false)
                    setPasswordForm({ newPassword: "", confirmPassword: "" })
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit">
                  {t("admin.updatePassword")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      )}
    </div>
  )
}

