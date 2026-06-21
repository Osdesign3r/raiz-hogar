import NotificationBell from "@/components/NotificationBell"



export default function HeaderHome({nombre}:{nombre:string}){


const fecha = new Date().toLocaleDateString(

"es-CO",

{

weekday:"long",

day:"numeric",

month:"long"

}

)



return(


<div className="flex justify-between items-center">


<div>


<p className="text-xs uppercase text-muted">


{fecha}


</p>



<h1 className="text-2xl font-semibold">


Hola,


{nombre}


👋


</h1>



</div>



<NotificationBell/>


</div>


)

}
