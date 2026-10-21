import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"

type Props = {
  title: string
  subtitle?: string
  backHref?: string
  action?: ReactNode
}

/** Encabezado único de página: mismo tamaño, peso y espaciado en toda la app. */
export default function PageHeader({ title, subtitle, backHref, action }: Props) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        {backHref && (
          <Link href={backHref} className="icon-btn -ml-2" aria-label="Volver">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[1.75rem] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  )
}
