// lib/firebase.ts
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

// Núcleo compartido: asume que el permiso YA está resuelto (granted) y solo
// obtiene el token + lo guarda. No toca Notification.requestPermission —
// eso es justamente lo que no se puede llamar sin gesto en iOS.
//
// IMPORTANTE: ya no atrapa el error internamente — lo deja subir. Antes el
// try/catch de acá adentro se comía cualquier excepción de getToken() y
// devolvía null en silencio, así que quien llamaba a esta función nunca
// podía saber SI falló ni POR QUÉ falló. Ahora el error real llega a quien
// llama (ej. el botón "Verificar / reintentar" en Configuración) y se puede
// mostrar en pantalla.
async function obtenerYGuardarToken() {
  const messaging = getMessaging(app)
  const swRegistration = await navigator.serviceWorker.ready

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  })

  if (!token) {
    throw new Error("Firebase getToken() devolvió vacío sin lanzar excepción — revisa la VAPID key.")
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Firebase puede rotar el token del navegador de tanto en tanto (es
    // comportamiento normal de FCM, no un error). Sin este borrado, el
    // token viejo se queda guardado junto al nuevo — mismo usuario, dos
    // filas, y la Edge Function le manda push a ambas: notificación
    // doblada en el mismo dispositivo. Política: 1 token activo por
    // usuario, el más reciente gana.
    const { error: delErr } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .neq("token", token)
    if (delErr) throw new Error("Fallo al limpiar tokens viejos: " + delErr.message)

    const { error: upsertErr } = await supabase
      .from("push_tokens")
      .upsert(
        { user_id: user.id, token, platform: detectarPlataforma() },
        { onConflict: "user_id,token" }
      )
    if (upsertErr) throw new Error("Fallo al guardar en push_tokens: " + upsertErr.message)
  } else {
    throw new Error("No hay sesión de Supabase activa al momento de guardar el token.")
  }

  return token
}

// Para uso EXCLUSIVO dentro de un onClick — en iOS, Notification.requestPermission()
// llamado sin un gesto directo del usuario no muestra el diálogo y puede
// quemar el permiso a "denied" para siempre. Esta función es la única
// autorizada a pedir permiso.
export async function requestNotificationPermission() {
  if (typeof window === "undefined") return null
  if (!("Notification" in window)) return null
  if (!("serviceWorker" in navigator)) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  return obtenerYGuardarToken()
}

// Para uso en efectos automáticos (mount, login) — NO pide permiso, solo
// refresca el token si el usuario YA lo concedió antes. Seguro sin gesto
// porque no dispara ningún diálogo nuevo.
export async function refrescarTokenSiYaHabilitado() {
  if (typeof window === "undefined") return null
  if (!("Notification" in window)) return null
  if (!("serviceWorker" in navigator)) return null
  if (Notification.permission !== "granted") return null

  return obtenerYGuardarToken()
}