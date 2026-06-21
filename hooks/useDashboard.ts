"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { calcularBalance } from "@/lib/finanzas"



export interface TimelineItem{
id:string
title:string
subtitle:string
status:"late"|"today"|"future"
}



export interface ActivityItem{
id:string
message:string
time:string
}



export interface DashboardData{

loading:boolean

nombre:string

totalMes:number

balance:string

timeline:TimelineItem[]

activity:ActivityItem[]

}



const hoy=new Date()

const fechaHoy=hoy.toISOString().split("T")[0]



const fechaInicio=`${hoy.getFullYear()}-${String(

hoy.getMonth()+1

).padStart(2,"0")}-01`



const ultimoDia=new Date(

hoy.getFullYear(),

hoy.getMonth()+1,

0

)

.toISOString()

.split("T")[0]



const fmt=(n:number)=>

new Intl.NumberFormat(

"es-CO",

{

style:"currency",

currency:"COP",

maximumFractionDigits:0

}

).format(n)




export function useDashboard():DashboardData{


const [loading,setLoading]=useState(true)

const [nombre,setNombre]=useState("")

const [totalMes,setTotalMes]=useState(0)

const [balance,setBalance]=useState("")

const [timeline,setTimeline]=useState<TimelineItem[]>([])

const [activity,setActivity]=useState<ActivityItem[]>([])




useEffect(()=>{

cargar()

},[])



async function cargar(){


setLoading(true)


const {

data:{session}

}=await supabase.auth.getSession()


if(!session){

setLoading(false)

return

}


const [

perfilRes,

perfilesRes,

gastosRes,

eventosRes,

documentosRes


]=await Promise.all([



supabase

.from("perfiles")

.select("nombre")

.eq("id",session.user.id)

.single(),




supabase

.from("perfiles")

.select("id,nombre"),




supabase

.from("gastos")

.select("*")

.eq("visibilidad","compartido")

.gte("fecha",fechaInicio)

.lte("fecha",ultimoDia),




supabase

.from("eventos")

.select("*")

.eq("completado",false)

.order(

"fecha",

{ascending:true}

)

.limit(5),




supabase

.from("documentos")

.select("id,nombre,created_at")

.order(

"created_at",

{ascending:false}

)

.limit(3)



])



const perfiles=

perfilesRes.data ?? []


const gastos=

gastosRes.data ?? []



const eventos=

eventosRes.data ?? []



const documentos=

documentosRes.data ?? []



setNombre(

perfilRes.data?.nombre ??

""

)



const total=gastos.reduce(

(acc,g)=>

acc+Number(g.valor),

0

)



setTotalMes(total)



/* balance */

const b=

calcularBalance(

perfiles,

gastos

)


if(

b.acreedor &&

b.deudor

){

setBalance(

`${b.deudor.nombre} debe ${fmt(b.diferencia)} a ${b.acreedor.nombre}`

)

}

else{

setBalance("En paz")

}




/* timeline */



const items:TimelineItem[]=[]



eventos.forEach(e=>{


const evento=

new Date(

e.fecha+

"T12:00:00"

)



const ahora=

new Date()



ahora.setHours(

12,

0,

0,

0

)



const diff=Math.round(

(

evento.getTime()

-

ahora.getTime()

)

/

86400000

)



items.push({


id:e.id,


title:e.titulo,


subtitle:e.fecha,



status:

diff<0

?

"late"

:

diff===0

?

"today"

:

"future"



})



})



setTimeline(

items

)




/* actividad real */



const actividades:ActivityItem[]=[]




gastos

.sort(

(a,b)=>

new Date(b.created_at).getTime()

-

new Date(a.created_at).getTime()

)

.slice(0,3)

.forEach(g=>{


actividades.push({


id:

`g-${g.id}`,


message:

`💸 ${g.concepto}`,


time:

new Date(

g.created_at

)

.toLocaleDateString(

"es-CO"

)



})


})





documentos.forEach(d=>{


actividades.push({


id:

`d-${d.id}`,


message:

`📄 ${d.nombre}`,


time:

new Date(

d.created_at

)

.toLocaleDateString(

"es-CO"

)



})


})





setActivity(

actividades

.slice(0,5)

)



setLoading(false)


}



return{


loading,

nombre,

totalMes,

balance,

timeline,

activity


}



}