"use client"

import HeaderHome from "@/components/home/HeaderHome"
import HouseholdCard from "@/components/home/HouseholdCard"
import TodayTimeline from "@/components/home/TodayTimeline"
import ActivityFeed from "@/components/home/ActivityFeed"
import QuickActions from "@/components/home/QuickActions"
import {
calcularBalance
}
from "@/lib/finanzas"

import { useDashboard } from "@/hooks/useDashboard"



export default function HomePage() {


const {

loading,

nombre,

totalMes,

balance,

timeline,

activity


}=useDashboard()



return(

<main className="min-h-screen pb-28 p-4">


<div className="max-w-md mx-auto space-y-5">



<HeaderHome


nombre={nombre}

/>



<HouseholdCard


loading={loading}

totalMes={totalMes}

balance={balance}

/>



<TodayTimeline


items={timeline}

/>



<ActivityFeed


items={activity}

/>



<QuickActions/>




</div>


</main>


)

}
