"use client"

import { useState } from "react"
import { TrendingUp, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { useLanguage } from "@/contexts/language-context"

interface WeightEntry {
  id: string
  date: string
  weight: number
  notes?: string
}

interface WeightGoal {
  id: string
  target_weight: number
  goal_type: "weekly" | "monthly"
  start_date: string
  end_date: string
  notes?: string
}

interface WeightTrackerProps {
  weightEntries: WeightEntry[]
  weightGoals: WeightGoal[]
  onAdd?: () => void
  onEdit?: (entry: WeightEntry) => void
  onDelete?: (entry: WeightEntry) => void
  loading?: boolean
  isAdmin?: boolean
  weightUnit?: string
}

const ITEMS_PER_PAGE = 8

export function WeightTracker({
  weightEntries,
  weightGoals,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
  isAdmin = false,
  weightUnit = "kg"
}: WeightTrackerProps) {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)

  // Prepare chart data - sort by date
  const chartData = weightEntries
    .map(entry => ({
      date: format(new Date(entry.date), "MMM d"),
      fullDate: entry.date,
      weight: Number(entry.weight.toFixed(1)),
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())

  // Get all weight goals for reference lines (active and future goals)
  const goalsForChart = weightGoals.filter(goal => {
    const today = new Date()
    const endDate = new Date(goal.end_date)
    // Show goals that haven't ended yet
    return today <= endDate
  }).map(goal => {
    const today = new Date()
    const endDate = new Date(goal.end_date)
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      ...goal,
      daysLeft: daysLeft > 0 ? daysLeft : 0
    }
  })

  // Calculate Y-axis domain with 1kg intervals
  const allWeights = [
    ...chartData.map(d => d.weight),
    ...goalsForChart.map(g => g.target_weight)
  ]
  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) : 70
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 80
  
  // Round down to nearest 1kg below, round up to nearest 1kg above
  // Add padding: 1kg below min, 1kg above max for better visualization
  const yAxisMin = Math.max(0, Math.floor(minWeight - 1))
  const yAxisMax = Math.ceil(maxWeight + 1)
  
  // Generate ticks every 1kg
  const yAxisTicks: number[] = []
  for (let i = yAxisMin; i <= yAxisMax; i += 1) {
    yAxisTicks.push(i)
  }

  // Calculate pagination
  const totalPages = Math.ceil(weightEntries.length / ITEMS_PER_PAGE)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedEntries = weightEntries.slice(startIndex, endIndex)

  return (
    <Card className="bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("progress.weight")}</h2>
            <p className="text-sm text-muted-foreground">{t("progress.trackWeight")}</p>
          </div>
        </div>
        {onAdd && (
          <Button
            onClick={onAdd}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </Button>
        )}
      </div>

      {/* Weight Progress Chart */}
      {chartData.length > 0 && (
        <div className="mb-6">
          {/* Chart Legend */}
          {goalsForChart.length > 0 && (
            <div className="mb-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-8 border-t-2 border-dashed" 
                  style={{ borderColor: "hsl(221.2 83.2% 53.3%)" }}
                ></div>
                <span className="text-muted-foreground">Target Weight Goal</span>
              </div>
            </div>
          )}
          <ChartContainer
            config={{
              weight: {
                label: "Weight",
                color: "hsl(142.1 76.2% 36.3%)",
              },
              target: {
                label: "Target",
                color: "hsl(221.2 83.2% 53.3%)",
              },
            }}
            className="h-[300px] w-full"
          >
            <LineChart data={chartData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                label={{ value: `Weight (${weightUnit})`, angle: -90, position: 'insideLeft' }}
                domain={[yAxisMin, yAxisMax]}
                ticks={yAxisTicks}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="weight" 
                name="weight"
                stroke="var(--color-weight)" 
                strokeWidth={3}
                dot={{ fill: "var(--color-weight)", r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
              />
              {goalsForChart.map((goal) => {
                const daysText = goal.daysLeft === 0 
                  ? "Today" 
                  : goal.daysLeft === 1 
                  ? "1 day left" 
                  : `${goal.daysLeft} days left`
                return (
                  <ReferenceLine 
                    key={goal.id}
                    y={goal.target_weight} 
                    stroke="hsl(221.2 83.2% 53.3%)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ 
                      value: `Target: ${goal.target_weight.toFixed(1)} ${weightUnit} (${daysText})`, 
                      position: "top",
                      fill: "hsl(221.2 83.2% 53.3%)",
                      fontSize: 12,
                      fontWeight: 600,
                      offset: 10
                    }}
                  />
                )
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* Weight Entries List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : weightEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAdmin ? "No weight entries logged yet." : t("progress.noWeightEntries")}
          </p>
        ) : (
          <>
            {paginatedEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-background p-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </span>
                    {entry.notes && (
                      <span className="text-xs text-muted-foreground mt-1">{entry.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {entry.weight.toFixed(1)} {weightUnit}
                  </span>
                  {isAdmin && onEdit && onDelete && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

