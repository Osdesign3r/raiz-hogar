import { supabase } from "@/lib/supabase"


export async function createNotification(

userId:string,

tipo:string,

titulo:string,

mensaje:string,

payload:any={}

){

return supabase

.from("notifications")

.insert({

user_id:userId,

tipo,

titulo,

mensaje,

payload

})

}