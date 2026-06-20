"use client"

import { useEffect } from "react"
import { requestNotificationPermission } from "@/lib/firebase"

export default function PushNotificationProvider(){

useEffect(()=>{

requestNotificationPermission()

},[])

return null

}