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

  if (!("serviceWorker" in navigator)) return null

  const permission = await Notification.requestPermission()

  if (permission !== "granted") return null

  try {
    const messaging = getMessaging(app)

    const swRegistration = await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })

    if (!token) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Firebase puede rotar el token del navegador de tanto en tanto (es
      // comportamiento normal de FCM, no un error). Sin este borrado, el
      // token viejo se queda guardado junto al nuevo — mismo usuario, dos
      // filas, y la Edge Function le manda push a ambas: notificación
      // doblada en el mismo dispositivo. Política: 1 token activo por
      // usuario, el más reciente gana.
      await supabase
        .from("push_tokens")
        .delete()
        .eq("user_id", user.id)
        .neq("token", token)

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