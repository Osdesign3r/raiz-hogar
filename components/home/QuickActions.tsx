import Link from "next/link"



export default function QuickActions(){



return(


<section>



<p className="text-xs uppercase tracking-widest text-muted mb-3">


Acciones rápidas


</p>




<div className="grid grid-cols-3 gap-2">




<Link href="/finanzas">


<div className="surface rounded-2xl p-4 text-center">


➕


<p className="text-xs mt-2">


Gasto


</p>



</div>


</Link>




<Link href="/calendario">


<div className="surface rounded-2xl p-4 text-center">


📅


<p className="text-xs mt-2">


Evento


</p>



</div>


</Link>




<Link href="/documentos">


<div className="surface rounded-2xl p-4 text-center">


📄


<p className="text-xs mt-2">


Documento


</p>



</div>


</Link>




</div>



</section>



)

}
