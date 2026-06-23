import type { ActivityItem } from "@/hooks/useDashboard"

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-muted mb-3">
        Actividad reciente
      </p>

      <div className="space-y-2">
        {items.map(a => (
          <div key={a.id} className="surface rounded-2xl p-4">
            <p className="text-sm">{a.message}</p>
            <p className="text-xs text-muted">{a.time}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
