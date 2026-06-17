"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Wallet, Calendar, FileText, Settings, TrendingUp } from "lucide-react"

type DashData = {
  nombre: string
  totalMes: number
  totalOscar: number
  totalPareja: number
  eventos: { titulo: string; fecha: string; hora: string | null }[]
}

const hoy = new Date()
const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split("T")[0]
const fechaInicio = `${mesActual}-01`
const fechaHoy = hoy.toISOString().split("T")[0]

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const diasHasta = (fecha: string) => {
  const diff = Math.ceil((new Date(fecha + "T12:00:00").getTime() - hoy.getTime()) / 86400000)
  if (diff === 0) return { label: "Hoy", urgent: true }
  if (diff === 1) return { label: "Mañana", urgent: true }
  return { label: `${diff} días`, urgent: false }
}

const formatFechaEvento = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })

export default function Home() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [perfilRes, gastosRes, eventosRes] = await Promise.all([
        supabase.from("perfiles").select("nombre").eq("id", session.user.id).single(),
        supabase.from("gastos").select("valor, division").gte("fecha", fechaInicio).lte("fecha", ultimoDia),
        supabase.from("eventos").select("titulo, fecha, hora").gte("fecha", fechaHoy)
          .order("fecha", { ascending: true }).limit(3),
      ])

      const gastos = gastosRes.data ?? []

      const totalOscar = gastos.reduce((acc, g) => {
        if (g.division === "50-50") return acc + Number(g.valor) / 2
        if (g.division === "oscar") return acc + Number(g.valor)
        return acc
      }, 0)

      const totalPareja = gastos.reduce((acc, g) => {
        if (g.division === "50-50") return acc + Number(g.valor) / 2
        if (g.division === "pareja") return acc + Number(g.valor)
        return acc
      }, 0)

      setData({
        nombre: perfilRes.data?.nombre ?? "tú",
        totalMes: totalOscar + totalPareja,
        totalOscar,
        totalPareja,
        eventos: eventosRes.data ?? [],
      })
      setLoading(false)
    }

    cargar()
  }, [])

  const fechaLabel = hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })

  const pctOscar = data
    ? data.totalMes > 0 ? Math.round((data.totalOscar / data.totalMes) * 100) : 50
    : 50

  return (
    <main className="min-h-screen pb-28 p-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="mb-5 mt-2">
          <p className="text-xs uppercase tracking-widest text-muted mb-1 capitalize">{fechaLabel}</p>
          {loading ? (
            <div className="h-8 w-40 rounded-lg bg-[var(--surface)] animate-pulse" />
          ) : (
            <h1 className="text-2xl font-semibold">Hola, {data?.nombre} 👋</h1>
          )}
        </div>

        {/* Hero card — gasto del mes */}
        <div className="accent-gradient rounded-2xl p-5 mb-3 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full bg-white/4" />
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">
            Gasto {hoy.toLocaleDateString("es-CO", { month: "long" })}
          </p>
          {loading ? (
            <div className="h-9 w-36 rounded-lg bg-white/10 animate-pulse mb-4" />
          ) : (
            <p className="text-4xl font-semibold text-white mb-4 tracking-tight">
              {fmt(data?.totalMes ?? 0)}
            </p>
          )}
          <div className="flex gap-2">
            <div className="bg-white/15 rounded-xl px-3 py-2 flex-1">
              <p className="text-white/60 text-xs mb-0.5">Oscar</p>
              <p className="text-white text-sm font-medium">{fmt(data?.totalOscar ?? 0)}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 flex-1">
              <p className="text-white/60 text-xs mb-0.5">Pareja</p>
              <p className="text-white text-sm font-medium">{fmt(data?.totalPareja ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Barra de balance */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-secondary">Oscar · {pctOscar}%</span>
            <span className="text-xs text-secondary">Pareja · {100 - pctOscar}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full accent-gradient transition-all duration-500"
              style={{ width: `${pctOscar}%` }}
            />
          </div>
          {data && Math.abs(data.totalOscar - data.totalPareja) > 0 && (
            <p className="text-xs text-muted mt-2 text-center">
              {data.totalOscar > data.totalPareja
                ? `Pareja le debe ${fmt(data.totalOscar - data.totalPareja)}`
                : `Oscar le debe ${fmt(data.totalPareja - data.totalOscar)}`}
            </p>
          )}
        </div>

        {/* Próximos eventos */}
        {(data?.eventos?.length ?? 0) > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest text-muted mb-2 mt-4">Próximamente</p>
            <div className="space-y-2 mb-4">
              {data!.eventos.map((e, i) => {
                const { label, urgent } = diasHasta(e.fecha)
                return (
                  <div key={i} className="surface border-subtle rounded-2xl p-4 flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${urgent ? "accent-glow" : ""}`}
                      style={{ background: urgent ? "var(--accent)" : "rgba(255,255,255,0.2)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.titulo}</p>
                      <p className="text-xs text-muted">
                        {formatFechaEvento(e.fecha)}{e.hora ? ` · ${e.hora}` : ""}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full shrink-0"
                      style={{
                        background: urgent ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "rgba(255,255,255,0.06)",
                        color: urgent ? "var(--accent)" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Módulos */}
        <p className="text-xs uppercase tracking-widest text-muted mb-2 mt-4">Módulos</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/finanzas",     icon: Wallet,   label: "Finanzas",    sub: "Gastos del hogar" },
            { href: "/calendario",   icon: Calendar, label: "Calendario",  sub: "Eventos compartidos" },
            { href: "/documentos",   icon: FileText, label: "Documentos",  sub: "Próximamente" },
            { href: "/configuracion",icon: Settings, label: "Config",      sub: "Perfil y tema" },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}>
              <div className="surface border-subtle rounded-2xl p-4 hover:bg-[var(--surface-2)] transition-colors active:scale-95">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                >
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                </div>
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs text-muted mt-0.5">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}
