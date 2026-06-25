"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell } from "lucide-react"
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
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) marcarTodasLeidas()
        }}
        className="relative w-11 h-11 rounded-xl surface border-subtle flex items-center justify-center"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-14 right-0 w-80 surface border-subtle rounded-2xl p-4 z-50 shadow-xl max-h-96 overflow-y-auto">
          <p className="font-semibold mb-3">Hoy</p>

          {notificaciones.length === 0 && (
            <p className="text-xs text-muted">Sin novedades hoy</p>
          )}

          {notificaciones.map(n => (
            <div key={n.id} className="pb-3 mb-3 border-b border-white/5">
              <p className="text-sm">{n.titulo}</p>
              <p className="text-xs text-muted">{n.mensaje}</p>
              <p className="text-[10px] text-muted mt-1">
                {new Date(n.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}