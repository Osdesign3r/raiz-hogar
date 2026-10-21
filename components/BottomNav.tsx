"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Wallet, Calendar, FileText, Settings } from "lucide-react"

const NAV = [
  { href: "/",              icon: Home,     label: "Inicio" },
  { href: "/finanzas",      icon: Wallet,   label: "Finanzas" },
  { href: "/calendario",    icon: Calendar, label: "Agenda" },
  { href: "/documentos",    icon: FileText, label: "Docs" },
  { href: "/configuracion", icon: Settings, label: "Ajustes" },
]

// /familia cuelga de Ajustes, así que ahí también se ilumina esa pestaña.
const esActiva = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/") ||
      (href === "/configuracion" && pathname.startsWith("/familia"))

export default function BottomNav() {
  const pathname = usePathname()
  if (pathname === "/login") return null

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl"
      style={{ zIndex: "var(--z-nav)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2 md:max-w-xl">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = esActiva(pathname, href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl"
              >
                <span
                  className="flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200"
                  style={{
                    background: active
                      ? "color-mix(in srgb, var(--accent) 22%, transparent)"
                      : "transparent",
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.25 : 1.75}
                    style={{ color: active ? "var(--accent-text)" : "var(--text-muted)" }}
                    className={active ? "" : "transition-colors group-hover:!text-[var(--text-secondary)]"}
                  />
                </span>
                <span
                  className="text-[11px] font-semibold leading-none"
                  style={{ color: active ? "var(--accent-text)" : "var(--text-muted)" }}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
