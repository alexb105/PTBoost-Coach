import { NutritionTracker } from "@/components/nutrition-tracker"
import { ClientHeader } from "@/components/client-header"

export default function NutritionPage() {
  return (
    <main className="min-h-screen pb-bottom-nav">
      <ClientHeader />
      <NutritionTracker />
    </main>
  )
}
