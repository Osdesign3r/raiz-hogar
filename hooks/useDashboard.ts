"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { calcularBalance } from "@/lib/finanzas"

export interface TimelineItem {
  id: string
  title: string
  subtitle: string
  status: "late" | "today" | "future"
}

export interface ActivityItem {
  id: string
  message: string
  time: string
  ts: number
}

export interface DashboardData {
  loading: boolean
  nombre: string
  totalMes: number
  balance: string
  timeline: TimelineItem[]
  activity: ActivityItem[]
}

const MAX_TIMELINE = 3
const MAX_ATRASADOS_EN_TIMELINE = 2
const MAX_ACTIVITY = 3

const hoy = new Date()
const fechaInicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`
const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split("T")[0]
const hoyStr = hoy.toISOString().split("T")[0]

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

export function useDashboard(): DashboardData {
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState("")
  const [totalMes, setTotalMes] = useState(0)
  const [balance, setBalance] = useState("")
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [perfilRes, perfilesRes, gastosRes, eventosRes, documentosRes] = await Promise.all([
      supabase.from("perfiles").select("nombre").eq("id", session.user.id).single(),
      supabase.from("perfiles").select("id,nombre"),
      supabase.from("gastos").select("*").eq("visibilidad", "compartido").gte("fecha", fechaInicio).lte("fecha", ultimoDia),
      // tareas pendientes (cualquier fecha) + eventos desde hoy en adelante.
      // Un evento pasado no es "atrasado" — ya ocurrió, no hay nada que hacer con él.
      supabase
        .from("eventos")
        .select("*")
        .or(`and(tipo.eq.tarea,completado.eq.false),and(tipo.eq.evento,fecha.gte.${hoyStr})`)
        .order("fecha", { ascending: true })
        .limit(20),
      supabase.from("documentos").select("id,nombre,created_at").order("created_at", { ascending: false }).limit(MAX_ACTIVITY),
    ])

    const perfiles = perfilesRes.data ?? []
    const gastos = gastosRes.data ?? []
    const eventos = eventosRes.data ?? []
    const documentos = documentosRes.data ?? []

    setNombre(perfilRes.data?.nombre ?? "")

    const total = gastos.reduce((acc, g) => acc + Number(g.valor), 0)
    setTotalMes(total)

    const b = calcularBalance(perfiles, gastos)
    setBalance(b.acreedor && b.deudor ? `${b.deudor.nombre} debe ${fmt(b.diferencia)} a ${b.acreedor.nombre}` : "En paz")

    /* Mi día: vencidos primero (tope 2, solo tareas — un evento no "vence"),
       luego próximos, total tope 3. */
    const conEstado = eventos.map(e => {
      const evento = new Date(e.fecha + "T12:00:00")
      const ahora = new Date(); ahora.setHours(12, 0, 0, 0)
      const diff = Math.round((evento.getTime() - ahora.getTime()) / 86400000)
      return {
        id: e.id,
        title: e.titulo,
        subtitle: e.fecha,
        status: (diff < 0 ? "late" : diff === 0 ? "today" : "future") as TimelineItem["status"],
      }
    })

    const atrasados = conEstado.filter(e => e.status === "late").slice(0, MAX_ATRASADOS_EN_TIMELINE)
    const proximos = conEstado.filter(e => e.status !== "late").slice(0, MAX_TIMELINE - atrasados.length)
    setTimeline([...atrasados, ...proximos].slice(0, MAX_TIMELINE))

    const actividades: ActivityItem[] = [
      ...gastos.map(g => ({
        id: `g-${g.id}`,
        message: `💸 ${g.concepto}`,
        ts: new Date(g.created_at).getTime(),
        time: new Date(g.created_at).toLocaleDateString("es-CO"),
      })),
      ...documentos.map(d => ({
        id: `d-${d.id}`,
        message: `📄 ${d.nombre}`,
        ts: new Date(d.created_at).getTime(),
        time: new Date(d.created_at).toLocaleDateString("es-CO"),
      })),
    ].sort((a, b) => b.ts - a.ts).slice(0, MAX_ACTIVITY)

    setActivity(actividades)
    setLoading(false)
  }

  return { loading, nombre, totalMes, balance, timeline, activity }
}