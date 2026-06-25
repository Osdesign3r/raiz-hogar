import Link from "next/link"
import { AlertTriangle, Clock3, CalendarDays, ChevronRight } from "lucide-react"
import type { TimelineItem } from "@/hooks/useDashboard"

export default function TodayTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-muted mb-3">Mi día</p>

      <div className="space-y-2">
        {items.map(e => (
          <Link key={e.id} href="/calendario">
            <div className="surface rounded-2xl p-4 flex items-center justify-between gap-3 active:opacity-70 transition">
              <div className="flex gap-3 items-start min-w-0">
                {e.status === "late"   && <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                {e.status === "today"  && <Clock3 size={16} className="text-yellow-400 shrink-0 mt-0.5" />}
                {e.status === "future" && <CalendarDays size={16} className="text-blue-400 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted">{e.subtitle}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}