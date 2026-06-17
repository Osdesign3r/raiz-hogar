import { supabase } from "@/lib/supabase"

export async function getDocuments(
  hogarId: string
) {
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("hogar_id", hogarId)
    .order("created_at", {
      ascending: false,
    })

  if (error) throw error

  return data
}