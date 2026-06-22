// lib/database.types.ts
//
// GENERADO AUTOMÁTICAMENTE desde el schema real de Supabase.
// NO EDITAR A MANO. Para regenerar después de una migración:
//
//   npx supabase gen types typescript --project-id ziaztueqxnehnaijzmvu > lib/database.types.ts
//
// (o pedímelo a mí — tengo el MCP de Supabase conectado y lo puedo regenerar
// directo desde el schema sin necesidad de que corras nada local)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          emoji: string
          id: string
          nombre: string
        }
        Insert: {
          emoji: string
          id?: string
          nombre: string
        }
        Update: {
          emoji?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          archivo_url: string
          categoria: string
          created_at: string | null
          created_by: string | null
          etiquetas: string[] | null
          fecha_vencimiento: string | null
          hogar_id: string
          id: string
          miembro_id: string | null
          nombre: string
          notas: string | null
          visibilidad: string
        }
        Insert: {
          archivo_url: string
          categoria: string
          created_at?: string | null
          created_by?: string | null
          etiquetas?: string[] | null
          fecha_vencimiento?: string | null
          hogar_id: string
          id?: string
          miembro_id?: string | null
          nombre: string
          notas?: string | null
          visibilidad?: string
        }
        Update: {
          archivo_url?: string
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          etiquetas?: string[] | null
          fecha_vencimiento?: string | null
          hogar_id?: string
          id?: string
          miembro_id?: string | null
          nombre?: string
          notas?: string | null
          visibilidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_miembro_id_fkey"
            columns: ["miembro_id"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          asignado_a: string | null
          color: string | null
          completado: boolean
          completado_at: string | null
          created_at: string | null
          descripcion: string | null
          fecha: string
          hogar_id: string | null
          hora: string | null
          id: string
          recordatorio_minutos_antes: number | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          asignado_a?: string | null
          color?: string | null
          completado?: boolean
          completado_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          hogar_id?: string | null
          hora?: string | null
          id?: string
          recordatorio_minutos_antes?: number | null
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          asignado_a?: string | null
          color?: string | null
          completado?: boolean
          completado_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          hogar_id?: string | null
          hora?: string | null
          id?: string
          recordatorio_minutos_antes?: number | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria_id: string | null
          concepto: string
          created_at: string | null
          fecha: string
          hogar_id: string | null
          id: string
          notas: string | null
          pagado_por: string | null
          porcentaje_pagador: number | null
          user_id: string | null
          valor: number
          visibilidad: string
        }
        Insert: {
          categoria_id?: string | null
          concepto: string
          created_at?: string | null
          fecha?: string
          hogar_id?: string | null
          id?: string
          notas?: string | null
          pagado_por?: string | null
          porcentaje_pagador?: number | null
          user_id?: string | null
          valor: number
          visibilidad?: string
        }
        Update: {
          categoria_id?: string | null
          concepto?: string
          created_at?: string | null
          fecha?: string
          hogar_id?: string | null
          id?: string
          notas?: string | null
          pagado_por?: string | null
          porcentaje_pagador?: number | null
          user_id?: string | null
          valor?: number
          visibilidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_pagado_por_fkey"
            columns: ["pagado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hogar_usuarios: {
        Row: {
          created_at: string | null
          hogar_id: string
          id: string
          rol: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hogar_id: string
          id?: string
          rol?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hogar_id?: string
          id?: string
          rol?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hogar_usuarios_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hogar_usuarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hogares: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      miembros: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          fecha_nacimiento: string | null
          hogar_id: string | null
          id: string
          nombre: string
          notas: string | null
          parentesco: string
          tipo: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          fecha_nacimiento?: string | null
          hogar_id?: string | null
          id?: string
          nombre: string
          notas?: string | null
          parentesco: string
          tipo?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          fecha_nacimiento?: string | null
          hogar_id?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          parentesco?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miembros_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          leida: boolean | null
          mensaje: string
          payload: Json | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          leida?: boolean | null
          mensaje: string
          payload?: Json | null
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string
          payload?: Json | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nombre?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_notificacion: {
        Args: {
          p_mensaje: string
          p_payload?: Json
          p_tipo: string
          p_titulo: string
          p_user_id: string
        }
        Returns: string
      }
      mis_hogares: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const