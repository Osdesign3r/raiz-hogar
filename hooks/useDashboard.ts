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

    const [perfilRes, perfilesRes, gastosRes, eventosRes, documentosRes, gastosBalRes] = await Promise.all([
      supabase.from("perfiles").select("nombre").eq("id", session.user.id).single(),
      supabase.from("perfiles").select("id,nombre"),
      supabase.from("gastos").select("*").eq("visibilidad", "compartido").gte("fecha", fechaInicio).lte("fecha", ultimoDia),
      supabase
        .from("eventos")
        .select("*")
        .or(`and(tipo.eq.tarea,completado.eq.false),and(tipo.eq.evento,fecha.gte.${hoyStr})`)
        .order("fecha", { ascending: true })
        .limit(20),
      supabase.from("documentos").select("id,nombre,created_at,created_by").order("created_at", { ascending: false }).limit(MAX_ACTIVITY),
      // Sin filtro de fecha — saldo corrido histórico, igual que en Finanzas.
      // Home y Finanzas deben mostrar exactamente el mismo número.
      supabase.from("gastos").select("id,valor,pagado_por,porcentaje_pagador").eq("visibilidad", "compartido"),
    ])

    const perfiles = perfilesRes.data ?? []
    const gastos = gastosRes.data ?? []          // solo mes actual — para totalMes y actividad
    const gastosBalance = gastosBalRes.data ?? [] // todos los meses — para el saldo corrido
    const eventos = eventosRes.data ?? []
    const documentos = documentosRes.data ?? []

    setNombre(perfilRes.data?.nombre ?? "")

    const nombrePorId = new Map(perfiles.map(p => [p.id, p.nombre]))
    const nombreDe = (id: string | null) => {
      if (!id) return "Alguien"
      if (id === session.user.id) return "Tú"
      return nombrePorId.get(id) ?? "Tu pareja"
    }

    const total = gastos.reduce((acc, g) => acc + Number(g.valor), 0)
    setTotalMes(total)

    // Mismo balance, contado distinto según quién lo lee — esto es lo que
    // lo separa de un estado de cuenta. "X le debe a Y" es neutral en el
    // papel pero suena a cobranza cuando lo lees en tu propia pantalla.
    const b = calcularBalance(perfiles, gastosBalance)
    if (b.acreedor && b.deudor) {
      const monto = fmt(b.diferencia)
      if (b.acreedor.id === session.user.id) {
        setBalance(`Vas ${monto} adelante este mes`)
      } else if (b.deudor.id === session.user.id) {
        setBalance(`Te faltan ${monto} para emparejar`)
      } else {
        setBalance(`Faltan ${monto} para emparejar`)
      }
    } else {
      setBalance("Van parejos 🤝")
    }

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
        message: `💸 ${nombreDe(g.pagado_por)}: ${g.concepto}`,
        ts: new Date(g.created_at).getTime(),
        time: new Date(g.created_at).toLocaleDateString("es-CO"),
      })),
      ...documentos.map(d => ({
        id: `d-${d.id}`,
        message: `📄 ${nombreDe(d.created_by)}: ${d.nombre}`,
        ts: new Date(d.created_at).getTime(),
        time: new Date(d.created_at).toLocaleDateString("es-CO"),
      })),
    ].sort((a, b) => b.ts - a.ts).slice(0, MAX_ACTIVITY)

    setActivity(actividades)
    setLoading(false)
  }

  return { loading, nombre, totalMes, balance, timeline, activity }
}