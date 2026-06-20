"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Wallet, Calendar, FileText, Settings, AlertTriangle, Check, Bell } from "lucide-react"
import { createNotification } from "@/lib/notifications"
import NotificationBell from "@/components/NotificationBell"

type PersonaTotal = { id: string; nombre: string; total: number }
type EventoDash = { id: string; titulo: string; fecha: string; hora: string | null; tipo: string; asignado_a: string | null }

type DashData = {
  nombre: string
  userId: string
  totalMes: number
  personas: PersonaTotal[]
  acreedorId: string | null
  deudorId: string | null
  diferencia: number
  atrasados: EventoDash[]
  proximos: EventoDash[]
}

const hoy = new Date()
const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split("T")[0]
const fechaInicio = `${mesActual}-01`
const fechaHoy = hoy.toISOString().split("T")[0]

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const diasHasta = (fecha: string) => {

  const hoyNormalizado = new Date()
  hoyNormalizado.setHours(12,0,0,0)

  const evento = new Date(fecha + "T12:00:00")

  const diff = Math.round(
    (evento.getTime() - hoyNormalizado.getTime()) / 86400000
  )

  if (diff <= 0)
    return { label: "Hoy", urgent: true }

  if (diff === 1)
    return { label: "Mañana", urgent: true }
if (diff < 0)
  return { label: "Atrasado", urgent: true }
  return {
    label: `${diff} días`,
    urgent: false
  }

}

const formatFechaEvento = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
const formatHora = (h: string | null) => {

  if (!h) return ""

  return h.slice(0, 5)

}
export default function Home() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications,setNotifications]=useState<any[]>([])
const [showNotifications,setShowNotifications]=useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [perfilRes, perfilesHogarRes, gastosRes, atrasadosRes, proximosRes, 
] = await Promise.all([
        supabase.from("perfiles").select("nombre").eq("id", session.user.id).single(),
        supabase.from("perfiles").select("id, nombre"),
        supabase.from("gastos").select("valor, visibilidad, pagado_por, porcentaje_pagador")
          .eq("visibilidad", "compartido")
          .gte("fecha", fechaInicio).lte("fecha", ultimoDia),
        supabase.from("eventos").select("id, titulo, fecha, hora, tipo, asignado_a")
          .eq("tipo", "tarea").eq("completado", false).lt("fecha", fechaHoy)
          .order("fecha", { ascending: true }),
        supabase.from("eventos").select("id, titulo, fecha, hora, tipo, asignado_a, completado")
          .gte("fecha", fechaHoy)
          .order("fecha", { ascending: true }).limit(4),
      ])
      

      const gastos   = gastosRes.data ?? []
      const personas = perfilesHogarRes.data ?? []

      // Lo que le corresponde a cada uno (su parte del gasto, no lo que adelantó)
      const totalesPorPersona: Record<string, number> = {}
      personas.forEach(p => { totalesPorPersona[p.id] = 0 })

      // Saldo real: cuánto adelantó cada uno por encima de su propia parte
      const saldos: Record<string, number> = {}
      personas.forEach(p => { saldos[p.id] = 0 })

      gastos.forEach(g => {
        const valorNum = Number(g.valor)
        const pct = g.porcentaje_pagador ?? 50
        if (!g.pagado_por) return

        const parteDelPagador = valorNum * pct / 100
        const parteDelOtro    = valorNum - parteDelPagador
        const otro = personas.find(p => p.id !== g.pagado_por)

        totalesPorPersona[g.pagado_por] = (totalesPorPersona[g.pagado_por] ?? 0) + parteDelPagador
        if (otro) totalesPorPersona[otro.id] = (totalesPorPersona[otro.id] ?? 0) + parteDelOtro

        saldos[g.pagado_por] = (saldos[g.pagado_por] ?? 0) + parteDelOtro
        if (otro) saldos[otro.id] = (saldos[otro.id] ?? 0) - parteDelOtro
      })

      const totalMes = gastos.reduce((acc, g) => acc + Number(g.valor), 0)

      const entradasSaldo = Object.entries(saldos)
      const acreedor = entradasSaldo.find(([, v]) => v > 0.5)
      const deudor   = entradasSaldo.find(([, v]) => v < -0.5)

      setData({
        nombre: perfilRes.data?.nombre ?? "tú",
        userId: session.user.id,
        totalMes,
        personas: personas.map(p => ({ id: p.id, nombre: p.nombre, total: totalesPorPersona[p.id] ?? 0 })),
        acreedorId: acreedor ? acreedor[0] : null,
        deudorId: deudor ? deudor[0] : null,
        diferencia: acreedor ? acreedor[1] : 0,
        atrasados: atrasadosRes.data ?? [],
        proximos: (proximosRes.data ?? []).filter(e => !(e.tipo === "tarea" && e.completado)),
      })

      setLoading(false)
    }

    cargar()
  }, [])

  const fechaLabel = hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
  const nombrePorId = (id: string | null) => data?.personas.find(p => p.id === id)?.nombre ?? "alguien"
  const nombreAsignado = (id: string | null) => {
    if (id === null) return "Ambos"
    if (id === data?.userId) return "Tú"
    return nombrePorId(id)
  }
const unreadCount =
notifications.filter(
n=>!n.read
).length
  const marcarHecho = async (id: string) => {
    await supabase.from("eventos").update({ completado: true, completado_at: new Date().toISOString() }).eq("id", id)
    setData(prev => prev ? { ...prev, atrasados: prev.atrasados.filter(e => e.id !== id) } : prev)
  }

  return (
    <main className="min-h-screen pb-28 p-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
      <div className="flex justify-between items-start mb-5 mt-2">

<div>

<p className="text-xs uppercase tracking-widest text-muted mb-1 capitalize">
{fechaLabel}
</p>

<h1 className="text-2xl font-semibold">
Hola, {data?.nombre} 👋
</h1>

</div>



<button

onClick={()=>
setShowNotifications(
!showNotifications
)
}

className="
relative
w-11
h-11
rounded-xl
surface
border-subtle
flex
items-center
justify-center
"

>

<Bell size={18}/>


{unreadCount>0 && (

<span
className="
absolute
-top-1
-right-1
bg-red-500
text-white
text-[10px]
w-5
h-5
rounded-full
flex
items-center
justify-center
"
>

{unreadCount}

</span>

)}

</button>


</div>

{
showNotifications && (


<div
className="
surface
border-subtle
rounded-2xl
p-4
mb-4
space-y-3
"
>


<p className="text-sm font-semibold">
Notificaciones
</p>



{
notifications.length===0 && (

<p className="text-xs text-muted">

No hay notificaciones

</p>

)
}




{
notifications.map(n=>(


<div
key={n.id}
className="
border-b
border-white/5
pb-2
"
>


<p className="text-sm">

{n.title}

</p>



<p
className="
text-xs
text-muted
"
>

{n.message}

</p>


</div>


))
}



</div>


)
}


        {/* Hero card — gasto del mes */}
        <div className="accent-gradient rounded-2xl p-5 mb-3 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full bg-white/4" />
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">
            Gasto compartido {hoy.toLocaleDateString("es-CO", { month: "long" })}
          </p>
          {loading ? (
            <div className="h-9 w-36 rounded-lg bg-white/10 animate-pulse mb-4" />
          ) : (
            <p className="text-4xl font-semibold text-white mb-4 tracking-tight">
              {fmt(data?.totalMes ?? 0)}
            </p>
          )}
          <div className="flex gap-2">
            {(data?.personas ?? []).map(p => (
              <div key={p.id} className="bg-white/15 rounded-xl px-3 py-2 flex-1 min-w-0">
                <p className="text-white/60 text-xs mb-0.5 truncate">{p.nombre}</p>
                <p className="text-white text-sm font-medium">{fmt(p.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Saldo real */}
        {data && data.acreedorId && data.deudorId && (
          <div className="surface border-subtle rounded-2xl p-4 mb-3">
            <p className="text-xs text-muted text-center">
              {nombrePorId(data.deudorId)} le debe a {nombrePorId(data.acreedorId)}:{" "}
              <span className="font-semibold" style={{ color: "var(--accent)" }}>{fmt(data.diferencia)}</span>
            </p>
          </div>
        )}

        {/* Se quedó pendiente — tareas atrasadas sin completar */}
        {(data?.atrasados?.length ?? 0) > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest text-red-400 mb-2 mt-4 flex items-center gap-1">
              <AlertTriangle size={11} /> Se quedó pendiente
            </p>
            <div className="space-y-2 mb-4">
              {data!.atrasados.map(e => (
                <div key={e.id} className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                  <button
                    onClick={() => marcarHecho(e.id)}
                    className="w-5 h-5 rounded-full border-2 border-red-400/50 hover:border-red-400 flex items-center justify-center shrink-0 transition"
                  >
                    <Check size={11} className="text-red-400 opacity-0 hover:opacity-100" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-red-300/70">{formatFechaEvento(e.fecha)} · {nombreAsignado(e.asignado_a)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Próximos eventos y tareas */}
        {(data?.proximos?.length ?? 0) > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest text-muted mb-2 mt-4">Próximamente</p>
            <div className="space-y-2 mb-4">
              {data!.proximos.map((e) => {
                const { label, urgent } = diasHasta(e.fecha)
                return (
                  <div key={e.id} className="surface border-subtle rounded-2xl p-4 flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${urgent ? "accent-glow" : ""}`}
                      style={{ background: urgent ? "var(--accent)" : "rgba(255,255,255,0.2)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.titulo}</p>
                     <p className="text-xs text-muted">
  {formatFechaEvento(e.fecha)}

  {e.hora && (
    <>
      {" · "}
      {formatHora(e.hora)}
    </>
  )}

  {" · "}
  {nombreAsignado(e.asignado_a)}
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
            { href: "/documentos",   icon: FileText, label: "Documentos",  sub: "Bóveda familiar" },
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
