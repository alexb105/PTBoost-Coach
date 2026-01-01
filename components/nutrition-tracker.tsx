"use client"

import { useState, useEffect } from "react"
import { Apple, Plus, Flame, Loader2, Edit, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/language-context"

interface NutritionTarget {
  id: string
  customer_id: string
  calories: number
  protein: number
  carbs: number
  fats: number
  suggestions?: string
}

interface MacroGoal {
  name: string
  current: number
  goal: number
  unit: string
  color: string
}

interface Meal {
  id: string
  customer_id: string
  name: string
  date: string
  time: string
  calories: number
  protein?: number
  carbs?: number
  fats?: number
  items: string[]
  created_at: string
  updated_at: string
}

interface NutritionTrackerProps {
  customerId?: string // Optional customerId for admin view
  onUpdateTargets?: () => void // Optional callback for admin to update targets
}

export function NutritionTracker({ customerId, onUpdateTargets }: NutritionTrackerProps = {}) {
  const { t, language } = useLanguage()
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null)
  const isAdminView = !!customerId
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [translatedSuggestions, setTranslatedSuggestions] = useState<string | null>(null)
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(customerId ? `admin-nutrition-${customerId}-date` : 'client-nutrition-date')
      return saved || new Date().toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  })
  const [showNutritionTracking, setShowNutritionTracking] = useState(false)
  const [mealTemplates, setMealTemplates] = useState<any[]>([])
  const [editingMealTemplate, setEditingMealTemplate] = useState<any | null>(null)
  const [isMealTemplateDialogOpen, setIsMealTemplateDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [viewingTemplate, setViewingTemplate] = useState<any | null>(null)
  const [isViewTemplateDialogOpen, setIsViewTemplateDialogOpen] = useState(false)
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false)

  // Meal form state
  const [mealForm, setMealForm] = useState({
    name: "",
    time: "",
    items: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  })

  // Default values (will be overridden by admin-set targets)
  const defaultCalories = 2400
  const defaultMacros: MacroGoal[] = [
    { name: "Protein", current: 145, goal: 180, unit: "g", color: "bg-primary" },
    { name: "Carbs", current: 220, goal: 250, unit: "g", color: "bg-chart-2" },
    { name: "Fats", current: 55, goal: 70, unit: "g", color: "bg-chart-4" },
  ]

  useEffect(() => {
    fetchNutritionTarget()
    fetchMeals()
    fetchMealTemplates()
  }, [selectedDate])

  // Translate suggestions when language or suggestions change
  useEffect(() => {
    let isMounted = true

    const translateSuggestions = async () => {
      if (!nutritionTarget?.suggestions) {
        if (isMounted) {
          setTranslatedSuggestions(null)
        }
        return
      }

      // Don't translate if language is English
      if (language === 'en') {
        if (isMounted) {
          setTranslatedSuggestions(nutritionTarget.suggestions)
        }
        return
      }

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: nutritionTarget.suggestions, 
            targetLang: language 
          }),
        })

        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            setTranslatedSuggestions(data.translatedText || nutritionTarget.suggestions)
          }
        } else {
          if (isMounted) {
            setTranslatedSuggestions(nutritionTarget.suggestions)
          }
        }
      } catch (error) {
        if (!isMounted) return
        console.debug("Translation failed for suggestions, using original text:", error)
        if (isMounted) {
          setTranslatedSuggestions(nutritionTarget.suggestions)
        }
      }
    }

    translateSuggestions()

    return () => {
      isMounted = false
    }
  }, [nutritionTarget?.suggestions, language])

  const fetchMealTemplates = async () => {
    try {
      const endpoint = isAdminView 
        ? `/api/admin/customers/${customerId}/meal-templates`
        : "/api/customer/meal-templates"
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setMealTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error fetching meal templates:", error)
    }
  }

  const fetchNutritionTarget = async () => {
    try {
      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/nutrition`
        : "/api/customer/nutrition"
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setNutritionTarget(data.target)
      } else if (response.status === 401) {
        toast.error("Please log in to view nutrition targets")
      }
    } catch (error) {
      console.error("Error fetching nutrition target:", error)
    }
  }

  const fetchMeals = async () => {
    try {
      setLoading(true)
      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/meals?date=${selectedDate}`
        : `/api/customer/meals?date=${selectedDate}`
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setMeals(data.meals || [])
      } else if (response.status === 401) {
        toast.error("Please log in to view meals")
      }
    } catch (error) {
      console.error("Error fetching meals:", error)
      toast.error("Failed to load meals")
    } finally {
      setLoading(false)
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

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal)
    setShowNutritionTracking(false) // Hidden by default, user can expand if needed
    setMealForm({
      name: meal.name,
      time: meal.time,
      items: meal.items.join("\n"),
      calories: meal.calories?.toString() || "",
      protein: meal.protein?.toString() || "",
      carbs: meal.carbs?.toString() || "",
      fats: meal.fats?.toString() || "",
    })
    setIsMealDialogOpen(true)
  }

  const handleDeleteMeal = (mealId: string) => {
    setDeleteMealId(mealId)
    setIsDeleteDialogOpen(true)
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
        date: selectedDate,
        time: mealForm.time,
        calories: mealForm.calories ? parseInt(mealForm.calories) : 0,
        protein: mealForm.protein ? parseInt(mealForm.protein) : 0,
        carbs: mealForm.carbs ? parseInt(mealForm.carbs) : 0,
        fats: mealForm.fats ? parseInt(mealForm.fats) : 0,
        items: items,
      }

      const url = editingMeal
        ? isAdminView
          ? `/api/admin/customers/${customerId}/meals/${editingMeal.id}`
          : `/api/customer/meals/${editingMeal.id}`
        : isAdminView
          ? `/api/admin/customers/${customerId}/meals`
          : "/api/customer/meals"
      
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

  const handleConfirmDelete = async () => {
    if (!deleteMealId) return

    try {
      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/meals/${deleteMealId}`
        : `/api/customer/meals/${deleteMealId}`
      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete meal")
      }

      toast.success("Meal deleted successfully")
      setIsDeleteDialogOpen(false)
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

      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/meal-templates`
        : "/api/customer/meal-templates"
      const response = await fetch(endpoint, {
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

      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/meal-templates/${editingMealTemplate.id}`
        : `/api/customer/meal-templates/${editingMealTemplate.id}`
      const response = await fetch(endpoint, {
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

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const endpoint = isAdminView
        ? `/api/admin/customers/${customerId}/meal-templates/${templateId}`
        : `/api/customer/meal-templates/${templateId}`
      const response = await fetch(endpoint, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast.success("Template deleted successfully")
      fetchMealTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template")
    }
  }

  const handleCreateTemplate = () => {
    setEditingMealTemplate(null)
    setMealForm({ name: "", time: "", items: "", calories: "", protein: "", carbs: "", fats: "" })
    setShowNutritionTracking(false)
    setIsMealTemplateDialogOpen(true)
  }

  const handleViewTemplate = (template: any) => {
    setViewingTemplate(template)
    setIsViewTemplateDialogOpen(true)
  }

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

  // Use admin-set targets if available, otherwise use defaults
  const calorieGoal = nutritionTarget?.calories || defaultCalories
  
  // Calculate totals from meals
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0)
  const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0)
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0)
  const totalFats = meals.reduce((sum, meal) => sum + (meal.fats || 0), 0)
  
  const macros: MacroGoal[] = nutritionTarget
    ? [
        { name: t("nutrition.protein"), current: totalProtein, goal: nutritionTarget.protein, unit: t("nutrition.g"), color: "bg-primary" },
        { name: t("nutrition.carbs"), current: totalCarbs, goal: nutritionTarget.carbs, unit: t("nutrition.g"), color: "bg-chart-2" },
        { name: t("nutrition.fats"), current: totalFats, goal: nutritionTarget.fats, unit: t("nutrition.g"), color: "bg-chart-4" },
      ]
    : [
        { name: t("nutrition.protein"), current: totalProtein, goal: defaultMacros[0].goal, unit: t("nutrition.g"), color: "bg-primary" },
        { name: t("nutrition.carbs"), current: totalCarbs, goal: defaultMacros[1].goal, unit: t("nutrition.g"), color: "bg-chart-2" },
        { name: t("nutrition.fats"), current: totalFats, goal: defaultMacros[2].goal, unit: t("nutrition.g"), color: "bg-chart-4" },
      ]
  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // Calculate progress percentage, capping at 100% for display
  const getProgressValue = (current: number, goal: number): number => {
    if (goal === 0) return 0
    const percentage = (current / goal) * 100
    return Math.min(percentage, 100) // Cap at 100%
  }

  // Check if value exceeds goal
  const exceedsGoal = (current: number, goal: number): boolean => {
    return current > goal
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("nutrition.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("nutrition.trackDailyIntake")}</p>
          {!nutritionTarget && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("nutrition.noTargetsSet")}
            </p>
          )}
        </div>
        {isAdminView && onUpdateTargets && (
          <Button onClick={onUpdateTargets} className="gap-2">
            <Plus className="h-4 w-4" />
            {nutritionTarget ? t("admin.updateTargets") : t("admin.setTargets")}
          </Button>
        )}
      </div>

      {/* Daily Targets Overview */}
      {nutritionTarget && (
        <Card className="mb-6 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Apple className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("nutrition.dailyTargets")}</h2>
              <p className="text-sm text-muted-foreground">{t("nutrition.setByTrainer")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("nutrition.calories")}</p>
              <p className="text-lg font-semibold text-foreground">{nutritionTarget.calories} {t("nutrition.kcal")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("nutrition.protein")}</p>
              <p className="text-lg font-semibold text-foreground">{nutritionTarget.protein} {t("nutrition.g")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("nutrition.carbs")}</p>
              <p className="text-lg font-semibold text-foreground">{nutritionTarget.carbs} {t("nutrition.g")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("nutrition.fats")}</p>
              <p className="text-lg font-semibold text-foreground">{nutritionTarget.fats} {t("nutrition.g")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Admin Suggestions */}
      {nutritionTarget?.suggestions && (() => {
        const suggestionsText = translatedSuggestions || nutritionTarget.suggestions || ""
        const lines = suggestionsText.split('\n')
        const shouldTruncate = lines.length > 4
        const displayLines = isSuggestionsExpanded || !shouldTruncate ? lines : lines.slice(0, 4)
        const displayText = displayLines.join('\n')
        
        return (
          <Card className="mb-6 bg-primary/5 border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Apple className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{t("nutrition.suggestions")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {displayText}
                </p>
                {shouldTruncate && (
                  <button
                    type="button"
                    className="mt-3 flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-primary hover:text-primary/90 hover:bg-primary/10 rounded-md transition-all duration-200 group"
                    onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
                  >
                    {isSuggestionsExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                        <span>{t("common.showLess")}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                        <span>{t("common.showMore")}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Calorie Overview - Only show if there are meals with calories */}
      {totalCalories > 0 && (
      <Card className="mb-6 bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{totalCalories}</span>
              <span className="text-muted-foreground">/ {calorieGoal} {t("nutrition.kcal")}</span>
            </div>
              <p className="text-sm text-muted-foreground">
                {totalCalories > calorieGoal 
                  ? `${totalCalories - calorieGoal} ${t("nutrition.caloriesOver")}`
                  : `${calorieGoal - totalCalories} ${t("nutrition.caloriesRemaining")}`}
              </p>
            </div>
          </div>
          <Progress value={getProgressValue(totalCalories, calorieGoal)} className="h-2" />
      </Card>
      )}

      {/* Macros - Only show if there are meals with macro data */}
      {(totalProtein > 0 || totalCarbs > 0 || totalFats > 0) && (
      <Card className="mb-6 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Apple className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("nutrition.protein")}, {t("nutrition.carbs")}, {t("nutrition.fats")}</h2>
              <p className="text-sm text-muted-foreground">{t("progress.title")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
            {macros.map((macro, index) => {
              const isOverGoal = exceedsGoal(macro.current, macro.goal)
              return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{macro.name}</span>
                    <span className={isOverGoal ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {macro.current} / {macro.goal} {macro.unit}
                      {isOverGoal && " ⚠️"}
                </span>
              </div>
                  <div className="relative">
                    <Progress value={getProgressValue(macro.current, macro.goal)} className="h-2" />
                    {isOverGoal && (
                      <div className="absolute inset-0 flex items-center justify-end pr-1">
                        <span className="text-[10px] text-destructive font-bold">{t("nutrition.overGoal")}</span>
                      </div>
                    )}
                  </div>
            </div>
              )
            })}
        </div>
      </Card>
      )}

      {/* Meals */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-foreground text-base sm:text-lg">{isToday ? t("nutrition.todayMeals") : `${t("nutrition.meals")} - ${format(new Date(selectedDate), "MMM d, yyyy")}`}</h2>
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => setIsTemplatesModalOpen(true)}
              className="h-8 px-2 sm:px-3"
            >
              <BookOpen className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("templates.title")}</span>
            </Button>
            <Button 
              size="sm" 
              onClick={handleAddMeal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-2 sm:px-3"
            >
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("nutrition.addMeal")}</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const date = new Date(selectedDate)
              date.setDate(date.getDate() - 1)
              const newDate = date.toISOString().split('T')[0]
              setSelectedDate(newDate)
              if (typeof window !== 'undefined') {
                localStorage.setItem(customerId ? `admin-nutrition-${customerId}-date` : 'client-nutrition-date', newDate)
              }
            }}
            className="h-9 w-9 flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const newDate = e.target.value
              setSelectedDate(newDate)
              if (typeof window !== 'undefined') {
                localStorage.setItem(customerId ? `admin-nutrition-${customerId}-date` : 'client-nutrition-date', newDate)
              }
            }}
            className="flex-1 min-w-0"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const date = new Date(selectedDate)
              date.setDate(date.getDate() + 1)
              const newDate = date.toISOString().split('T')[0]
              setSelectedDate(newDate)
              if (typeof window !== 'undefined') {
                localStorage.setItem(customerId ? `admin-nutrition-${customerId}-date` : 'client-nutrition-date', newDate)
              }
            }}
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
            className="h-9 w-9 flex-shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {meals.length === 0 ? (
          <Card className="bg-card p-8 text-center">
            <p className="text-muted-foreground">{t("nutrition.noMeals")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMeal}
              className="mt-4"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("nutrition.addFirstMeal")}
            </Button>
          </Card>
        ) : (
          meals.map((meal) => (
            <Card key={meal.id} className="bg-card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{meal.name}</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEditMeal(meal)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMeal(meal.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatTime(meal.time)}</p>
              </div>
                {meal.calories > 0 && (
              <div className="text-right">
                <p className="font-semibold text-foreground">{meal.calories}</p>
                <p className="text-xs text-muted-foreground">{t("nutrition.kcal")}</p>
              </div>
                )}
            </div>
              {meal.items && meal.items.length > 0 && (
            <ul className="space-y-1">
              {meal.items.map((item, itemIndex) => (
                <li key={itemIndex} className="text-sm text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
              )}
          </Card>
          ))
        )}
      </div>

      {/* Add/Edit Meal Dialog */}
      <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeal ? t("nutrition.editMeal") : t("nutrition.addMeal")}</DialogTitle>
            <DialogDescription>
              {editingMeal ? t("nutrition.updateMealDetails") : t("nutrition.logNewMeal")}
            </DialogDescription>
          </DialogHeader>
          {!editingMeal && mealTemplates.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
              <Label className="text-sm font-medium mb-2 block">{t("templates.loadFromTemplate")}</Label>
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
              <Label htmlFor="meal-name">{t("nutrition.mealName")} *</Label>
              <Input
                id="meal-name"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                placeholder="e.g., Breakfast, Lunch, Dinner"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-time">{t("nutrition.time")} *</Label>
              <Input
                id="meal-time"
                type="time"
                value={mealForm.time}
                onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-items">{t("nutrition.whatDidYouEat")}</Label>
              <Textarea
                id="meal-items"
                value={mealForm.items}
                onChange={(e) => setMealForm({ ...mealForm, items: e.target.value })}
                placeholder="Oatmeal with berries&#10;2 eggs&#10;Black coffee"
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t("nutrition.whatDidYouEat")}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNutritionTracking(!showNutritionTracking)}
                className="w-full justify-between"
              >
                <span className="text-sm font-medium">
                  {showNutritionTracking ? t("nutrition.hide") : t("nutrition.show")} {t("nutrition.nutritionTracking")}
                </span>
                {showNutritionTracking ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {showNutritionTracking && (
                <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t("nutrition.nutritionTracking")}</Label>
                    <span className="text-xs text-muted-foreground">{t("nutrition.skipIfJustLog")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meal-calories" className="text-xs">{t("nutrition.calories")} ({t("nutrition.kcal")})</Label>
                      <Input
                        id="meal-calories"
                        type="number"
                        min="0"
                        value={mealForm.calories}
                        onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                        placeholder="Optional"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meal-protein" className="text-xs">{t("nutrition.protein")} ({t("nutrition.g")})</Label>
                      <Input
                        id="meal-protein"
                        type="number"
                        min="0"
                        value={mealForm.protein}
                        onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                        placeholder="Optional"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meal-carbs" className="text-xs">{t("nutrition.carbs")} ({t("nutrition.g")})</Label>
                      <Input
                        id="meal-carbs"
                        type="number"
                        min="0"
                        value={mealForm.carbs}
                        onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                        placeholder="Optional"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meal-fats" className="text-xs">{t("nutrition.fats")} ({t("nutrition.g")})</Label>
                      <Input
                        id="meal-fats"
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
                {t("common.cancel")}
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
                {t("templates.saveAsTemplate")}
              </Button>
              <Button type="submit">
                {editingMeal ? t("nutrition.updateMeal") : t("nutrition.addMeal")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Meal Template Dialog */}
      <Dialog open={isMealTemplateDialogOpen} onOpenChange={setIsMealTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("templates.editTemplate")}</DialogTitle>
            <DialogDescription>
              {t("templates.updateTemplate")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveMealTemplateEdit(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-meal-name">{t("nutrition.mealName")} *</Label>
              <Input
                id="edit-template-meal-name"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                placeholder="e.g., Breakfast, Lunch, Dinner"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-meal-time">{t("nutrition.time")} *</Label>
              <Input
                id="edit-template-meal-time"
                type="time"
                value={mealForm.time}
                onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-meal-items">{t("nutrition.whatDidYouEat")}</Label>
              <Textarea
                id="edit-template-meal-items"
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
                  {showNutritionTracking ? t("nutrition.hide") : t("nutrition.show")} {t("nutrition.nutritionTracking")}
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
                      <Label htmlFor="edit-template-meal-calories" className="text-xs">{t("nutrition.calories")} ({t("nutrition.kcal")})</Label>
                      <Input
                        id="edit-template-meal-calories"
                        type="number"
                        min="0"
                        value={mealForm.calories}
                        onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                        placeholder={t("nutrition.optional")}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-template-meal-protein" className="text-xs">{t("nutrition.protein")} ({t("nutrition.g")})</Label>
                      <Input
                        id="edit-template-meal-protein"
                        type="number"
                        min="0"
                        value={mealForm.protein}
                        onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                        placeholder={t("nutrition.optional")}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-template-meal-carbs" className="text-xs">{t("nutrition.carbs")} ({t("nutrition.g")})</Label>
                      <Input
                        id="edit-template-meal-carbs"
                        type="number"
                        min="0"
                        value={mealForm.carbs}
                        onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                        placeholder={t("nutrition.optional")}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-template-meal-fats" className="text-xs">{t("nutrition.fats")} ({t("nutrition.g")})</Label>
                      <Input
                        id="edit-template-meal-fats"
                        type="number"
                        min="0"
                        value={mealForm.fats}
                        onChange={(e) => setMealForm({ ...mealForm, fats: e.target.value })}
                        placeholder={t("nutrition.optional")}
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
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {t("common.update")} {t("templates.title").slice(0, -1)}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meal Templates Management Modal */}
      <Dialog open={isTemplatesModalOpen} onOpenChange={setIsTemplatesModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.mealTemplates")}</DialogTitle>
            <DialogDescription>
              Manage your meal templates for quick meal logging
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
                          {t("templates.useTemplate")}
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
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
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
                <Label className="text-sm font-medium">{t("nutrition.time")}</Label>
                <p className="text-sm text-muted-foreground mt-1">{viewingTemplate.time}</p>
              </div>
              {viewingTemplate.items && viewingTemplate.items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">{t("nutrition.whatDidYouEat")}</Label>
                  <ul className="mt-1 space-y-1">
                    {viewingTemplate.items.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(viewingTemplate.calories > 0 || viewingTemplate.protein > 0 || viewingTemplate.carbs > 0 || viewingTemplate.fats > 0) && (
                <div>
                  <Label className="text-sm font-medium">{t("nutrition.nutritionTracking")}</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    {viewingTemplate.calories > 0 && (
                      <div className="text-muted-foreground">{t("nutrition.calories")}: {viewingTemplate.calories} {t("nutrition.kcal")}</div>
                    )}
                    {viewingTemplate.protein > 0 && (
                      <div className="text-muted-foreground">{t("nutrition.protein")}: {viewingTemplate.protein}{t("nutrition.g")}</div>
                    )}
                    {viewingTemplate.carbs > 0 && (
                      <div className="text-muted-foreground">{t("nutrition.carbs")}: {viewingTemplate.carbs}{t("nutrition.g")}</div>
                    )}
                    {viewingTemplate.fats > 0 && (
                      <div className="text-muted-foreground">{t("nutrition.fats")}: {viewingTemplate.fats}{t("nutrition.g")}</div>
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
                  {t("common.close")}
                </Button>
                <Button
                  onClick={() => {
                    handleUseTemplate(viewingTemplate)
                    setIsViewTemplateDialogOpen(false)
                    setIsTemplatesModalOpen(false)
                  }}
                >
                  {t("templates.useTemplate")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("nutrition.deleteMealConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
