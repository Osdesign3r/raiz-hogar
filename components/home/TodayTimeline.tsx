import Link from "next/link"
import { AlertTriangle, Clock3, CalendarDays, ChevronRight } from "lucide-react"
import type { TimelineItem } from "@/hooks/useDashboard"

const fmtFecha = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })

const ESTADO = {
  late:   { Icon: AlertTriangle, color: "var(--danger)",       etiqueta: "Atrasado" },
  today:  { Icon: Clock3,        color: "var(--warning)",      etiqueta: "Hoy" },
  future: { Icon: CalendarDays,  color: "var(--accent-text)",  etiqueta: "" },
} as const

export default function TodayTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="mi-dia">
      <h2 id="mi-dia" className="section-label mb-3">Mi día</h2>

      <ul className="space-y-2">
        {items.map(e => {
          const { Icon, color, etiqueta } = ESTADO[e.status]
          return (
            <li key={e.id}>
              <Link
                href="/calendario"
                className="card flex min-h-[64px] items-center gap-3 p-3.5 transition-colors hover:border-[var(--border-strong)] active:bg-[var(--surface-2)]"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
                >
                  <Icon size={18} style={{ color }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.title}</span>
                  <span className="block text-sm text-muted">
                    {etiqueta && <span style={{ color }} className="font-semibold">{etiqueta} · </span>}
                    {fmtFecha(e.subtitle)}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
