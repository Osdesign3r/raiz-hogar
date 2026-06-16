import Link from "next/link"
import type { ReactNode } from "react"

type Accent = "blue" | "purple" | "green" | "amber"

type Props = {
  title: string
  description: string
  href: string
  icon?: ReactNode
  accent?: Accent
}

const ACCENT_CLASSES: Record<Accent, string> = {
  blue:   "text-blue-400   bg-blue-500/10   group-hover:bg-blue-500/20",
  purple: "text-purple-400 bg-purple-500/10 group-hover:bg-purple-500/20",
  green:  "text-green-400  bg-green-500/10  group-hover:bg-green-500/20",
  amber:  "text-amber-400  bg-amber-500/10  group-hover:bg-amber-500/20",
}

export default function DashboardCard({ title, description, href, icon, accent = "blue" }: Props) {
  return (
    <Link href={href} className="group">
      <div className="bg-slate-900 rounded-xl p-4 hover:bg-slate-800 transition flex items-center gap-4">
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition ${ACCENT_CLASSES[accent]}`}>
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className="ml-auto text-slate-600 group-hover:text-slate-400 transition">›</div>
      </div>
    </Link>
  )
}
