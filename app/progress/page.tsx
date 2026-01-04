import { ProgressTracker } from "@/components/progress-tracker"
import { ClientHeader } from "@/components/client-header"

export default function ProgressPage() {
  return (
    <main className="min-h-screen pb-bottom-nav">
      <ClientHeader />
      <ProgressTracker />
    </main>
  )
}
