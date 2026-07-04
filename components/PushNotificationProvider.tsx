"use client"

import { useEffect } from "react"
import { refrescarTokenSiYaHabilitado } from "@/lib/firebase"

// OJO: este componente NO pide permiso. Pedirlo automáticamente al montar
// es justo lo que rompía las push en iOS — Safari exige que
// Notification.requestPermission() se dispare desde un gesto directo del
// usuario (un tap), o si no, ignora la petición o la marca como "denied"
// para siempre. La petición real vive en un botón, en Configuración.
export default function PushNotificationProvider(){

useEffect(()=>{

refrescarTokenSiYaHabilitado()

},[])

return null

}