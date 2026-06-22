import { supabase } from "@/lib/supabase"

// Antes hacía supabase.from("notifications").insert(...) directo desde el cliente.
// Eso viola la política RLS de INSERT (auth.uid() = user_id) en cuanto intentás
// notificar a tu pareja en vez de a vos mismo — exactamente el caso de uso real
// de esta función. Ahora pasa por el RPC `crear_notificacion`, que valida con
// SECURITY DEFINER que ambos comparten hogar antes de insertar. Firma intacta:
// nada más en la app necesita cambiar.
export async function createNotification(
  userId: string,
  tipo: string,
  titulo: string,
  mensaje: string,
  payload: Record<string, unknown> = {}
) {
  return supabase.rpc("crear_notificacion", {
    p_user_id: userId,
    p_tipo: tipo,
    p_titulo: titulo,
    p_mensaje: mensaje,
    p_payload: payload,
  })
}
