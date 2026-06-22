// lib/types.ts
//
// Tipos de dominio de la app. A partir de ahora DERIVAN de lib/database.types.ts
// (generado directo del schema real de Supabase) en vez de estar escritos a mano.
// Esto significa: si una columna se borra o le cambia el tipo en una migración,
// esto rompe en tiempo de compilación acá mismo — no se entera nadie tres
// pantallas después con un bug silencioso en producción.
//
// Las uniones literales (GastoVisibilidad, EventoTipo, etc.) SÍ siguen siendo
// manuales: Postgres las tiene como CHECK constraints o texto libre, no como
// enums reales, así que Supabase no puede generarlas. Si agregás un valor nuevo
// en la base, tenés que agregarlo aquí también — es el único punto que sigue
// necesitando sincronía manual.

import type { Tables } from "./database.types"

export type Categoria = Tables<"categorias">

// nombre y created_at son nullable en el schema (no hay NOT NULL), pero en la
// práctica siempre están: nombre lo llena el trigger handle_new_user desde el
// perfil de Google al registrarse, created_at tiene default now(). Si algún
// día permitís perfiles sin nombre, hay que sacar este narrowing.
export type Perfil = Omit<Tables<"perfiles">, "nombre" | "created_at"> & {
  nombre: string
  created_at: string
}

export type Miembro = Omit<Tables<"miembros">, "created_at"> & {
  created_at: string
}

// privado: solo lo ve quien lo registró, no entra en la liquidación del hogar
// compartido: visible para el hogar, entra en el cálculo de quién le debe a quién
export type GastoVisibilidad = "privado" | "compartido"

export type Gasto = Omit<Tables<"gastos">, "hogar_id" | "user_id" | "visibilidad" | "created_at"> & {
  hogar_id: string    // lo completa el trigger set_hogar_id_default
  user_id: string     // lo completa el trigger set_gasto_defaults
  visibilidad: GastoVisibilidad
  created_at: string
  // join opcional
  categorias?: Categoria
}

export type GastoInsert = Omit<
  Gasto,
  "id" | "created_at" | "categorias" | "hogar_id" | "user_id"
> & {
  hogar_id?: string   // lo completa el trigger si se omite
  user_id?: string    // lo completa el trigger si se omite
}

export type EventoTipo = "evento" | "tarea"

export type Evento = Omit<Tables<"eventos">, "hogar_id" | "color" | "tipo" | "created_at"> & {
  hogar_id: string             // lo completa el trigger
  color: string                // la UI siempre manda un default ("blue") al guardar
  tipo: EventoTipo
  created_at: string
  // asignado_a: string | null  → null = compete a ambos, es informativo
}

export type EventoInsert = Omit<
  Evento,
  "id" | "created_at" | "hogar_id" | "user_id" | "completado" | "completado_at"
> & {
  hogar_id?: string
  user_id?: string
}

export type DocumentoCategoria =
  | "Familia"
  | "Salud"
  | "Educacion"
  | "Finanzas"
  | "Legal"
  | "Hogar"
  | "Vehiculos"
  | "Mascotas"
  | "Otros"

export type DocumentoVisibilidad = "privado" | "compartido"

export type Documento = Omit<
  Tables<"documentos">,
  "created_by" | "categoria" | "visibilidad" | "created_at"
> & {
  created_by: string   // siempre lo manda la app al insertar (auth.uid())
  categoria: DocumentoCategoria
  // archivo_url: path dentro del bucket privado 'documentos', NO una URL pública.
  // usar supabase.storage.from('documentos').createSignedUrl(archivo_url, ttl)
  visibilidad: DocumentoVisibilidad
  created_at: string
}

export type DocumentoInsert = Omit<Documento, "id" | "created_at" | "hogar_id" | "created_by"> & {
  hogar_id?: string
  created_by?: string
}

export type Notificacion = Omit<
  Tables<"notifications">,
  "user_id" | "leida" | "created_at" | "payload"
> & {
  user_id: string          // a quién va dirigida
  leida: boolean
  created_at: string
  payload: Record<string, unknown> | null
}
