const fmt=(n:number)=>


new Intl.NumberFormat(

"es-CO",

{

style:"currency",

currency:"COP",

maximumFractionDigits:0

}

).format(n)


type Props = {
  loading: boolean
  totalMes: number
  balance: string
}

export default function HouseholdCard({ loading, totalMes, balance }: Props){



return(


<div className="accent-gradient rounded-3xl p-5">


<p className="text-xs uppercase tracking-widest text-white/60">


Gasto compartido


</p>



{loading ? (
  <div className="h-10 w-40 bg-white/15 rounded-lg mt-2 animate-pulse" />
) : (
  <p className="text-4xl font-bold mt-2">
    {fmt(totalMes)}
  </p>
)}



<div className="mt-4">


<p className="text-sm text-white/70">


¿Cómo vamos?


</p>



{loading ? (
  <div className="h-6 w-32 bg-white/15 rounded-md mt-1 animate-pulse" />
) : (
  <p className="text-lg font-semibold">
    {balance}
  </p>
)}


</div>



</div>



)

}