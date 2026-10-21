"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Bell, BellOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Notificacion } from "@/lib/types"

function inicioDeHoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [open, setOpen] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .gte("created_at", inicioDeHoy()) // colchón del día, no historial
      .order("created_at", { ascending: false })

    setNotificaciones((data ?? []) as Notificacion[])
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    cargar(userId)

    const channel = supabase
      .channel(`notifications-bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => cargar(userId)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, cargar])

  // Cierra con Escape o al tocar fuera — un popover que solo se cierra
  // volviendo a tocar la campana atrapa al usuario en móvil.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    const onPointer = (e: PointerEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  const unreadCount = notificaciones.filter(n => !n.leida).length

  const marcarTodasLeidas = async () => {
    if (!userId) return

    await supabase
      .from("notifications")
      .update({ leida: true })
      .eq("user_id", userId)
      .eq("leida", false)
      .gte("created_at", inicioDeHoy())

    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) marcarTodasLeidas()
        }}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="card relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors hover:border-[var(--border-strong)]"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold"
            style={{ background: "var(--danger)", color: "#1a0508" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones de hoy"
          className="rise absolute right-0 top-14 max-h-[26rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-2xl shadow-black/60"
          style={{ zIndex: "var(--z-popover)" }}
        >
          <p className="section-label mb-3">Hoy</p>

          {notificaciones.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <BellOff size={22} className="text-muted" />
              <p className="text-sm text-muted">Sin novedades hoy</p>
            </div>
          )}

          <ul className="space-y-1">
            {notificaciones.map(n => (
              <li key={n.id} className="rounded-2xl bg-[var(--surface-2)] p-3">
                <p className="text-sm font-semibold">{n.titulo}</p>
                <p className="text-sm text-secondary">{n.mensaje}</p>
                <p className="num mt-1 text-xs text-muted">
                  {new Date(n.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
