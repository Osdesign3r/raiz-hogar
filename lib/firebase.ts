import { getMessaging, getToken } from "firebase/messaging"
import { app } from "./firebaseConfig"
import { supabase } from "./supabase"

function detectarPlataforma(): string {
  if (typeof navigator === "undefined") return "desconocida"
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return "android"
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  return "web"
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") return null

  if (!("Notification" in window)) return null

  const permission = await Notification.requestPermission()

  if (permission !== "granted") return null

  try {
    const messaging = getMessaging(app)

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    })

    if (!token) return null

    // Esto era lo que faltaba: antes el token se conseguía y se descartaba
    // (solo console.log). Sin guardarlo, no hay forma de mandarle un push
    // a este dispositivo nunca — toda la infraestructura de permisos era
    // teatro. El unique (user_id, token) en la tabla evita duplicar si esto
    // se vuelve a llamar para el mismo dispositivo.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from("push_tokens")
        .upsert(
          { user_id: user.id, token, platform: detectarPlataforma() },
          { onConflict: "user_id,token" }
        )
      if (error) console.error("No se pudo guardar el push token:", error)
    }

    return token
  } catch (error) {
    console.error("Messaging error:", error)
    return null
  }
}
