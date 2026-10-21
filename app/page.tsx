"use client"

import { Sprout } from "lucide-react"
import HeaderHome from "@/components/home/HeaderHome"
import HouseholdCard from "@/components/home/HouseholdCard"
import TodayTimeline from "@/components/home/TodayTimeline"
import ActivityFeed from "@/components/home/ActivityFeed"
import QuickActions from "@/components/home/QuickActions"
import EmptyState from "@/components/EmptyState"
import { useDashboard } from "@/hooks/useDashboard"

export default function HomePage() {
  const { loading, nombre, totalMes, balance, timeline, activity } = useDashboard()
  const vacio = !loading && timeline.length === 0 && activity.length === 0

  return (
    <main className="page-shell">
      <div className="page space-y-6">
        <HeaderHome nombre={nombre} />
        <HouseholdCard loading={loading} totalMes={totalMes} balance={balance} />
        <QuickActions />

        {loading ? (
          <div className="space-y-2" aria-hidden="true">
            {[1, 2].map(i => <div key={i} className="skeleton h-16" />)}
          </div>
        ) : vacio ? (
          <EmptyState
            icon={Sprout}
            title="La casa está en calma"
            description="Cuando agreguen gastos, eventos o documentos, lo verán aquí."
          />
        ) : (
          <>
            <TodayTimeline items={timeline} />
            <ActivityFeed items={activity} />
          </>
        )}
      </div>
    </main>
  )
}
