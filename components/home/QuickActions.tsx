import Link from "next/link"
import { Wallet, CalendarPlus, FileUp } from "lucide-react"

const ACCIONES = [
  { href: "/finanzas",   Icon: Wallet,       label: "Gasto"     },
  { href: "/calendario", Icon: CalendarPlus, label: "Evento"    },
  { href: "/documentos", Icon: FileUp,       label: "Documento" },
]

export default function QuickActions() {
  return (
    <section aria-labelledby="acciones">
      <h2 id="acciones" className="section-label mb-3">Acciones rápidas</h2>

      <div className="grid grid-cols-3 gap-2.5">
        {ACCIONES.map(({ href, Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="card flex min-h-[92px] flex-col items-center justify-center gap-2 p-3 transition-all hover:border-[var(--border-strong)] active:scale-[0.97]"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
            >
              <Icon size={22} strokeWidth={1.75} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
