const fmt=(n:number)=>


new Intl.NumberFormat(

"es-CO",

{

style:"currency",

currency:"COP",

maximumFractionDigits:0

}

).format(n)





export default function HouseholdCard({


totalMes,

balance


}:any){



return(


<div className="accent-gradient rounded-3xl p-5">


<p className="text-xs uppercase tracking-widest text-white/60">


Gasto compartido


</p>



<p className="text-4xl font-bold mt-2">


{fmt(totalMes)}


</p>



<div className="mt-4">


<p className="text-sm text-white/70">


¿Cómo vamos?


</p>



<p className="text-lg font-semibold">


{balance}


</p>



</div>



</div>



)

}