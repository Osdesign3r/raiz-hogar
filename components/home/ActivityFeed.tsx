import { Receipt, FileText } from "lucide-react"
import type { ActivityItem } from "@/hooks/useDashboard"

const ICONOS = { gasto: Receipt, documento: FileText } as const

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="actividad">
      <h2 id="actividad" className="section-label mb-3">Actividad reciente</h2>

      <ul className="card divide-y divide-[var(--border)] overflow-hidden">
        {items.map(a => {
          const Icon = ICONOS[a.kind]
          return (
            <li key={a.id} className="flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                <Icon size={18} className="text-secondary" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.message}</span>
                <span className="num block text-sm text-muted">{a.time}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
