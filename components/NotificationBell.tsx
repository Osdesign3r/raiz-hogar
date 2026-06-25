// components/NotificationBell.tsx
"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

// Medianoche local de hoy, expresada como el instante UTC equivalente.
// setHours opera en hora local; toISOString lo convierte correctamente
// sin importar el timezone del dispositivo.
function inicioDeHoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const cargar = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .gte("created_at", inicioDeHoy()) // solo el día de hoy — colchón, no archivo
      .order("created_at", { ascending: false })

    setNotifications(data ?? [])
  }

  useEffect(() => {
    cargar()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const readAll = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)
      .gte("created_at", inicioDeHoy()) // no toques nada fuera del día visible

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          readAll()
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

          {notifications.length === 0 && (
            <p className="text-xs text-muted">Sin novedades hoy</p>
          )}

          {notifications.map(n => (
            <div key={n.id} className="pb-3 mb-3 border-b border-white/5">
              <p className="text-sm">{n.title}</p>
              <p className="text-xs text-muted">{n.message}</p>
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