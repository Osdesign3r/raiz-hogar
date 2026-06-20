import { getToken } from "firebase/messaging"
import { messaging } from "@/lib/firebaseConfig"


export async function solicitarPermisos() {

const permiso = await Notification.requestPermission()


if(permiso !== "granted") return null


const token = await getToken(

messaging,

{
vapidKey:process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
}

)


return token

}