import { app } from "@/lib/firebaseConfig"

export async function solicitarPermisos() {
  if (typeof window === "undefined") return null

  if (!("Notification" in window)) return null

  const permiso = await Notification.requestPermission()

  if (permiso !== "granted") return null

  const { getMessaging, getToken } = await import("firebase/messaging")

  const messaging = getMessaging(app)

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  })

  return token
}