// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      docentes: {
        Row: {
          bolsa_cnpq: string
          created_at: string
          id: string
          indice_h: number
          jdp: boolean
          licenca: string
          nome: string
          scopus_id: string
        }
        Insert: {
          bolsa_cnpq?: string
          created_at?: string
          id?: string
          indice_h?: number
          jdp?: boolean
          licenca?: string
          nome: string
          scopus_id?: string
        }
        Update: {
          bolsa_cnpq?: string
          created_at?: string
          id?: string
          indice_h?: number
          jdp?: boolean
          licenca?: string
          nome?: string
          scopus_id?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string
          docente: string
          evento: string
          id: string
          local_data: string
          papel: string
        }
        Insert: {
          created_at?: string
          docente: string
          evento: string
          id?: string
          local_data: string
          papel: string
        }
        Update: {
          created_at?: string
          docente?: string
          evento?: string
          id?: string
          local_data?: string
          papel?: string
        }
        Relationships: []
      }
      mobilidade_docente: {
        Row: {
          created_at: string
          id: string
          instituicao: string
          link: string
          modalidade: string
          nome: string
          periodo: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          instituicao: string
          link?: string
          modalidade?: string
          nome: string
          periodo: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          instituicao?: string
          link?: string
          modalidade?: string
          nome?: string
          periodo?: string
          tipo?: string
        }
        Relationships: []
      }
      patentes: {
        Row: {
          autores: string
          created_at: string
          id: string
          inpi: string
          status: string
          titulo: string
        }
        Insert: {
          autores: string
          created_at?: string
          id?: string
          inpi: string
          status?: string
          titulo: string
        }
        Update: {
          autores?: string
          created_at?: string
          id?: string
          inpi?: string
          status?: string
          titulo?: string
        }
        Relationships: []
      }
      ppg: {
        Row: {
          created_at: string
          id: string
          modalidade: string
          nivel: string
          nome: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: string
          modalidade?: string
          nivel?: string
          nome: string
          uf?: string
        }
        Update: {
          created_at?: string
          id?: string
          modalidade?: string
          nivel?: string
          nome?: string
          uf?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      publicacoes: {
        Row: {
          ano: number
          autores: string
          created_at: string
          doi: string
          id: string
          justificativa: string
          periodico: string
          titulo: string
        }
        Insert: {
          ano: number
          autores: string
          created_at?: string
          doi?: string
          id?: string
          justificativa?: string
          periodico: string
          titulo: string
        }
        Update: {
          ano?: number
          autores?: string
          created_at?: string
          doi?: string
          id?: string
          justificativa?: string
          periodico?: string
          titulo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
