import { getMessaging, getToken } from "firebase/messaging"
import { app } from "./firebaseConfig"

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

    console.log("FCM Token:", token)

    return token
  } catch (error) {
    console.error("Messaging error:", error)
    return null
  }
}