import type { LucideIcon } from "lucide-react"

type Props = {
  icon: LucideIcon
  title: string
  description?: string
}

/** Estado vacío: icono SVG (nunca emoji), título y una línea de ayuda. */
export default function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
        <Icon size={28} strokeWidth={1.5} style={{ color: "var(--accent-text)" }} />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
    </div>
  )
}
