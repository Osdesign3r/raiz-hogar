import Link from "next/link"
import { Wallet, CalendarPlus, FileUp } from "lucide-react"

const ACCIONES = [
  { href: "/finanzas",   Icon: Wallet,      label: "Gasto"     },
  { href: "/calendario", Icon: CalendarPlus, label: "Evento"    },
  { href: "/documentos", Icon: FileUp,       label: "Documento" },
]

export default function QuickActions() {
  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-muted mb-3">
        Acciones rápidas
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ACCIONES.map(({ href, Icon, label }) => (
          <Link key={href} href={href}>
            <div className="surface border-subtle rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
              <Icon size={20} style={{ color: "var(--accent)" }} strokeWidth={1.5} />
              <p className="text-xs text-secondary">{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
