"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Wallet, Calendar, FileText, Settings } from "lucide-react"

const NAV = [
  { href: "/",             icon: Home,     label: "Inicio" },
  { href: "/finanzas",     icon: Wallet,   label: "Finanzas" },
  { href: "/calendario",   icon: Calendar, label: "Calendario" },
  { href: "/documentos",   icon: FileText, label: "Docs" },
  { href: "/configuracion",icon: Settings, label: "Config" },
]

export default function BottomNav() {
  const pathname = usePathname()
  if (pathname === "/login") return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13,13,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-md mx-auto flex justify-around items-center px-2 py-3">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[44px]">
              <div className="relative">
                <Icon
                  size={22}
                  style={{ color: active ? "var(--accent)" : "rgba(255,255,255,0.3)" }}
                  strokeWidth={active ? 2 : 1.5}
                />
                {active && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </div>
              <span
                className="text-[10px]"
                style={{ color: active ? "var(--accent)" : "rgba(255,255,255,0.25)" }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
