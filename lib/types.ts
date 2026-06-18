// lib/types.ts
// Tipos globales de la app — derivados del schema SQL

export type Miembro = {
  id: string
  nombre: string
  parentesco: string
  avatar_url: string | null

  hogar_id: string | null

  tipo: string | null

  fecha_nacimiento: string | null

  notas: string | null

  created_at: string
}

export type Categoria = {
  id: string
  nombre: string
  emoji: string
}

export type Perfil = {
  id: string
  nombre: string
  email: string | null
  avatar_url: string | null
  accent_color: string | null
  created_at: string
}

// privado: solo lo ve quien lo registró, no entra en la liquidación del hogar
// compartido: visible para el hogar, entra en el cálculo de quién le debe a quién
export type GastoVisibilidad = 'privado' | 'compartido'

export type Gasto = {
  id: string
  hogar_id: string
  user_id: string                    // quién registró el gasto
  concepto: string
  valor: number
  visibilidad: GastoVisibilidad
  pagado_por: string | null          // perfil.id — quién puso el dinero (solo aplica si es compartido)
  porcentaje_pagador: number | null  // 0-100 — qué % le corresponde a quien pagó; el resto lo debe el otro
  categoria_id: string | null
  fecha: string          // YYYY-MM-DD
  notas: string | null
  created_at: string
  // join opcional
  categorias?: Categoria
}

export type GastoInsert = Omit<
  Gasto,
  'id' | 'created_at' | 'categorias' | 'hogar_id' | 'user_id'
> & {
  hogar_id?: string   // lo completa el trigger si se omite
  user_id?: string    // lo completa el trigger si se omite
}

export type EventoTipo = 'evento' | 'tarea'

export type Evento = {
  id: string
  hogar_id: string
  user_id: string | null
  titulo: string
  fecha: string          // YYYY-MM-DD
  hora: string | null
  descripcion: string | null
  color: string
  tipo: EventoTipo
  asignado_a: string | null   // perfil.id; null = compete a ambos, es informativo
  completado: boolean
  completado_at: string | null
  recordatorio_minutos_antes: number | null
  created_at: string
}

export type EventoInsert = Omit<
  Evento,
  'id' | 'created_at' | 'hogar_id' | 'user_id' | 'completado' | 'completado_at'
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

export type Documento = {
  id: string

  hogar_id: string

  miembro_id: string | null

  nombre: string

  categoria: DocumentoCategoria

  archivo_url: string     // path dentro del bucket privado 'documentos', NO una URL pública.
                           // usar supabase.storage.from('documentos').createSignedUrl(archivo_url, ttl)

  visibilidad: DocumentoVisibilidad

  fecha_vencimiento: string | null

  notas: string | null

  etiquetas: string[] | null

  created_by: string

  created_at: string
}

export type DocumentoInsert = Omit<Documento, 'id' | 'created_at' | 'hogar_id' | 'created_by'> & {
  hogar_id?: string
  created_by?: string
}