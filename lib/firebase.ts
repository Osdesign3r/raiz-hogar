import { getMessaging, getToken } from "firebase/messaging"
import { app } from "./firebaseConfig"



export async function requestNotificationPermission(){


const permission =

await Notification.requestPermission()



if(permission!=="granted")
return



const messaging = getMessaging(app)



const token = await getToken(

messaging,

{

vapidKey:

process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

}

)



console.log(token)



}
